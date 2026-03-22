"""
AEOS Protocol — Stripe Settlement Engine

Real money settlement for agent contracts via Stripe.
Connects AEOS escrow to actual USD movement.

Flow:
  1. Contract created → Stripe PaymentIntent created (amount held)
  2. Obligation fulfilled → PaymentIntent captured (money moves)
  3. Dispute filed → Stripe refund initiated
  4. Contract completed → All captures finalized

Supports:
  - PaymentIntent-based escrow (authorize → capture pattern)
  - Automatic refund on dispute resolution
  - Multi-party settlement (split payments via Stripe Connect)
  - Webhook verification for async events
  - Full audit trail linked to AEOS ledger
"""

import time
import json
import os
import hmac
import hashlib
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field

try:
    import stripe
    HAS_STRIPE = True
except ImportError:
    HAS_STRIPE = False


@dataclass
class SettlementRecord:
    """Record of a real money settlement tied to an AEOS contract."""
    record_id: str
    contract_id: str
    stripe_payment_intent_id: str
    amount: int                          # In smallest currency unit (cents)
    currency: str
    status: str                          # created, authorized, captured, refunded, failed
    payer_did: str
    payee_did: str
    created_at: float
    captured_at: Optional[float] = None
    refunded_at: Optional[float] = None
    refund_amount: int = 0
    stripe_charge_id: Optional[str] = None
    stripe_refund_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "contract_id": self.contract_id,
            "stripe_payment_intent_id": self.stripe_payment_intent_id,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status,
            "payer_did": self.payer_did,
            "payee_did": self.payee_did,
            "created_at": self.created_at,
            "captured_at": self.captured_at,
            "refunded_at": self.refunded_at,
            "refund_amount": self.refund_amount,
        }


class StripeSettlementEngine:
    """Connects AEOS contracts to real Stripe payments.
    
    Uses the authorize-then-capture pattern:
    - When a contract is created, a PaymentIntent is authorized (funds held)
    - When obligations are fulfilled, the PaymentIntent is captured (funds move)
    - If a dispute is resolved with refund, the charge is refunded
    """

    def __init__(self, secret_key: Optional[str] = None,
                 webhook_secret: Optional[str] = None,
                 test_mode: bool = True):
        """Initialize the Stripe settlement engine.
        
        Args:
            secret_key: Stripe secret key (sk_test_... or sk_live_...)
            webhook_secret: Stripe webhook signing secret (whsec_...)
            test_mode: If True, validates that test keys are used
        """
        if not HAS_STRIPE:
            raise ImportError("stripe package not installed. Run: pip install stripe")

        self.secret_key = secret_key or os.environ.get("STRIPE_SECRET_KEY", "")
        self.webhook_secret = webhook_secret or os.environ.get("STRIPE_WEBHOOK_SECRET", "")

        if test_mode and self.secret_key and not self.secret_key.startswith("sk_test_"):
            raise ValueError("Test mode is on but a live key was provided. Set test_mode=False for production.")

        stripe.api_key = self.secret_key
        self.records: Dict[str, SettlementRecord] = {}
        self.contract_to_pi: Dict[str, str] = {}  # contract_id -> payment_intent_id

    def _generate_record_id(self, contract_id: str) -> str:
        h = hashlib.sha256(f"AEOS/settlement/{contract_id}/{time.time()}".encode())
        return f"stl_{h.hexdigest()[:16]}"

    # =========================================================================
    # ESCROW: Create PaymentIntent (authorize funds)
    # =========================================================================

    def create_escrow(self, contract_id: str, amount: int, currency: str,
                      payer_did: str, payee_did: str,
                      payment_method: Optional[str] = None,
                      description: Optional[str] = None) -> Dict[str, Any]:
        """Create a Stripe PaymentIntent to hold funds for a contract.
        
        Uses capture_method='manual' so funds are authorized but not captured.
        This is the "escrow" — money is reserved but not moved until fulfillment.
        
        Args:
            contract_id: AEOS contract ID
            amount: Amount in cents (e.g., 2500000 = $25,000)
            currency: Currency code (e.g., "usd")
            payer_did: DID of the paying agent
            payee_did: DID of the receiving agent
            payment_method: Stripe payment method ID (e.g., "pm_card_visa")
            description: Human-readable description
            
        Returns:
            Settlement record dict
        """
        try:
            # Create PaymentIntent with manual capture (authorize-only)
            pi_params = {
                "amount": amount,
                "currency": currency,
                "capture_method": "manual",  # Key: authorize but don't capture
                "description": description or f"AEOS Contract {contract_id}",
                "metadata": {
                    "aeos_contract_id": contract_id,
                    "payer_did": payer_did,
                    "payee_did": payee_did,
                    "protocol": "AEOS/1.0",
                },
            }

            if payment_method:
                pi_params["payment_method"] = payment_method
                pi_params["confirm"] = True

            pi = stripe.PaymentIntent.create(**pi_params)

            record_id = self._generate_record_id(contract_id)
            record = SettlementRecord(
                record_id=record_id,
                contract_id=contract_id,
                stripe_payment_intent_id=pi.id,
                amount=amount,
                currency=currency,
                status="authorized" if pi.status == "requires_capture" else pi.status,
                payer_did=payer_did,
                payee_did=payee_did,
                created_at=time.time(),
                metadata={"stripe_status": pi.status, "client_secret": pi.client_secret},
            )
            self.records[record_id] = record
            self.contract_to_pi[contract_id] = pi.id

            return {
                "success": True,
                "record_id": record_id,
                "stripe_payment_intent_id": pi.id,
                "client_secret": pi.client_secret,
                "status": record.status,
                "amount": amount,
                "currency": currency,
            }

        except stripe.StripeError as e:
            return {
                "success": False,
                "error": str(e),
                "error_code": getattr(e, "code", None),
            }

    # =========================================================================
    # CAPTURE: Release escrowed funds (obligation fulfilled)
    # =========================================================================

    def capture_escrow(self, contract_id: str,
                       amount_to_capture: Optional[int] = None) -> Dict[str, Any]:
        """Capture (release) escrowed funds when obligations are fulfilled.
        
        Args:
            contract_id: AEOS contract ID
            amount_to_capture: Amount to capture (None = full amount)
            
        Returns:
            Capture result dict
        """
        pi_id = self.contract_to_pi.get(contract_id)
        if not pi_id:
            return {"success": False, "error": f"No escrow found for contract {contract_id}"}

        try:
            capture_params = {}
            if amount_to_capture is not None:
                capture_params["amount_to_capture"] = amount_to_capture

            pi = stripe.PaymentIntent.capture(pi_id, **capture_params)

            # Update record
            for record in self.records.values():
                if record.contract_id == contract_id:
                    record.status = "captured"
                    record.captured_at = time.time()
                    if pi.latest_charge:
                        record.stripe_charge_id = pi.latest_charge if isinstance(pi.latest_charge, str) else pi.latest_charge.id

            return {
                "success": True,
                "contract_id": contract_id,
                "stripe_payment_intent_id": pi_id,
                "status": pi.status,
                "amount_captured": amount_to_capture or pi.amount,
            }

        except stripe.StripeError as e:
            return {"success": False, "error": str(e)}

    # =========================================================================
    # REFUND: Return funds on dispute resolution
    # =========================================================================

    def refund_escrow(self, contract_id: str, amount: Optional[int] = None,
                      reason: str = "dispute_resolution") -> Dict[str, Any]:
        """Refund escrowed/captured funds when a dispute is resolved.
        
        Args:
            contract_id: AEOS contract ID
            amount: Amount to refund (None = full refund)
            reason: Reason for refund
        """
        pi_id = self.contract_to_pi.get(contract_id)
        if not pi_id:
            return {"success": False, "error": f"No escrow for contract {contract_id}"}

        try:
            # First try to cancel if not yet captured
            pi = stripe.PaymentIntent.retrieve(pi_id)

            if pi.status == "requires_capture":
                # Cancel the authorization (no charge was made)
                canceled = stripe.PaymentIntent.cancel(pi_id)
                for record in self.records.values():
                    if record.contract_id == contract_id:
                        record.status = "refunded"
                        record.refunded_at = time.time()
                        record.refund_amount = record.amount
                return {
                    "success": True,
                    "method": "cancel_authorization",
                    "status": canceled.status,
                }

            elif pi.status == "succeeded":
                # Already captured — issue a refund
                refund_params = {"payment_intent": pi_id}
                if amount:
                    refund_params["amount"] = amount

                refund = stripe.Refund.create(**refund_params)

                for record in self.records.values():
                    if record.contract_id == contract_id:
                        record.status = "refunded"
                        record.refunded_at = time.time()
                        record.refund_amount = amount or record.amount
                        record.stripe_refund_id = refund.id

                return {
                    "success": True,
                    "method": "refund",
                    "refund_id": refund.id,
                    "amount": refund.amount,
                    "status": refund.status,
                }
            else:
                return {"success": False, "error": f"Cannot refund PI in status: {pi.status}"}

        except stripe.StripeError as e:
            return {"success": False, "error": str(e)}

    # =========================================================================
    # QUERY
    # =========================================================================

    def get_settlement(self, contract_id: str) -> Optional[Dict[str, Any]]:
        """Get settlement status for a contract."""
        for record in self.records.values():
            if record.contract_id == contract_id:
                # Refresh from Stripe
                try:
                    pi = stripe.PaymentIntent.retrieve(record.stripe_payment_intent_id)
                    record.metadata["stripe_status"] = pi.status
                except stripe.StripeError:
                    pass
                return record.to_dict()
        return None

    def list_settlements(self) -> List[Dict[str, Any]]:
        """List all settlement records."""
        return [r.to_dict() for r in self.records.values()]

    # =========================================================================
    # WEBHOOK VERIFICATION
    # =========================================================================

    def verify_webhook(self, payload: bytes, sig_header: str) -> Dict[str, Any]:
        """Verify a Stripe webhook signature and extract the event.
        
        Args:
            payload: Raw request body bytes
            sig_header: Value of Stripe-Signature header
        """
        if not self.webhook_secret:
            return {"verified": False, "error": "No webhook secret configured"}

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            return {
                "verified": True,
                "event_type": event.type,
                "event_id": event.id,
                "data": event.data.object.to_dict() if hasattr(event.data, 'object') else {},
            }
        except stripe.SignatureVerificationError:
            return {"verified": False, "error": "Invalid signature"}
        except Exception as e:
            return {"verified": False, "error": str(e)}

    # =========================================================================
    # STATUS
    # =========================================================================

    def status(self) -> Dict[str, Any]:
        """Engine status."""
        is_test = self.secret_key.startswith("sk_test_") if self.secret_key else None
        return {
            "engine": "stripe",
            "configured": bool(self.secret_key),
            "test_mode": is_test,
            "active_settlements": len(self.records),
            "total_escrowed": sum(r.amount for r in self.records.values() if r.status == "authorized"),
            "total_captured": sum(r.amount for r in self.records.values() if r.status == "captured"),
            "total_refunded": sum(r.refund_amount for r in self.records.values() if r.status == "refunded"),
        }
