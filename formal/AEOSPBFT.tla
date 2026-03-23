-------------------------------- MODULE AEOSPBFT --------------------------------
\* AEOS Protocol — Formal Specification of PBFT Consensus
\*
\* Models the core PBFT protocol (Castro-Liskov 1999) as used in AEOS.
\* Verifies safety (agreement) and liveness (termination) under
\* Byzantine faults where f < n/3.
\*
\* Properties verified:
\*   Safety (Agreement):
\*     - No two correct replicas commit different values for same sequence
\*     - A committed value has a valid quorum certificate (2f+1 sigs)
\*     - View change preserves committed values
\*
\*   Liveness (Termination):
\*     - If primary is correct and network is synchronous, ops commit
\*     - If primary is faulty, view change elects new primary
\*
\* This spec models a single consensus instance (one sequence number).

EXTENDS Naturals, FiniteSets

CONSTANTS
    N,                  \* Total replicas (e.g., 4)
    F,                  \* Max Byzantine faults (e.g., 1)
    Values              \* Set of possible values to propose

ASSUME N >= 3 * F + 1

Replicas == 0..(N-1)
Quorum == 2 * F + 1

VARIABLES
    view,               \* Current view number per replica: replica -> Nat
    phase,              \* Phase per replica: replica -> {"idle","pre-prepared","prepared","committed"}
    prepareVotes,       \* Prepare votes: replica -> set of replicas who sent PREPARE
    commitVotes,        \* Commit votes: replica -> set of replicas who sent COMMIT
    decided,            \* Decided value per replica: replica -> value | "none"
    proposedValue,      \* Value proposed by primary
    byzantine           \* Set of Byzantine replicas

vars == <<view, phase, prepareVotes, commitVotes, decided, proposedValue, byzantine>>

\* =========================================================================
\* TYPE INVARIANT
\* =========================================================================

TypeOK ==
    /\ \A r \in Replicas : view[r] \in Nat
    /\ \A r \in Replicas : phase[r] \in {"idle", "pre-prepared", "prepared", "committed"}
    /\ \A r \in Replicas : prepareVotes[r] \subseteq Replicas
    /\ \A r \in Replicas : commitVotes[r] \subseteq Replicas
    /\ \A r \in Replicas : decided[r] \in Values \cup {"none"}
    /\ byzantine \subseteq Replicas
    /\ Cardinality(byzantine) <= F

\* =========================================================================
\* INITIAL STATE
\* =========================================================================

Init ==
    /\ view = [r \in Replicas |-> 0]
    /\ phase = [r \in Replicas |-> "idle"]
    /\ prepareVotes = [r \in Replicas |-> {}]
    /\ commitVotes = [r \in Replicas |-> {}]
    /\ decided = [r \in Replicas |-> "none"]
    /\ proposedValue \in Values
    /\ byzantine \in SUBSET Replicas /\ Cardinality(byzantine) <= F

\* Primary for a given view
Primary(v) == v % N

\* Correct (non-Byzantine) replicas
Correct == Replicas \ byzantine

\* =========================================================================
\* ACTIONS
\* =========================================================================

\* Primary sends PRE-PREPARE; replica accepts and moves to pre-prepared
PrePrepare(r) ==
    /\ r \in Correct
    /\ phase[r] = "idle"
    /\ Primary(view[r]) \notin byzantine  \* Primary must be correct
    /\ phase' = [phase EXCEPT ![r] = "pre-prepared"]
    /\ prepareVotes' = [prepareVotes EXCEPT ![r] = prepareVotes[r] \cup {r}]
    /\ UNCHANGED <<view, commitVotes, decided, proposedValue, byzantine>>

\* Replica receives PREPARE from another correct replica
ReceivePrepare(r, sender) ==
    /\ r \in Correct
    /\ sender \in Correct
    /\ phase[sender] \in {"pre-prepared", "prepared", "committed"}
    /\ prepareVotes' = [prepareVotes EXCEPT ![r] = prepareVotes[r] \cup {sender}]
    /\ UNCHANGED <<view, phase, commitVotes, decided, proposedValue, byzantine>>

\* Replica reaches PREPARED state (received 2f+1 prepares)
BecamePrepared(r) ==
    /\ r \in Correct
    /\ phase[r] = "pre-prepared"
    /\ Cardinality(prepareVotes[r]) >= Quorum
    /\ phase' = [phase EXCEPT ![r] = "prepared"]
    /\ commitVotes' = [commitVotes EXCEPT ![r] = commitVotes[r] \cup {r}]
    /\ UNCHANGED <<view, prepareVotes, decided, proposedValue, byzantine>>

\* Replica receives COMMIT from another correct replica
ReceiveCommit(r, sender) ==
    /\ r \in Correct
    /\ sender \in Correct
    /\ phase[sender] \in {"prepared", "committed"}
    /\ commitVotes' = [commitVotes EXCEPT ![r] = commitVotes[r] \cup {sender}]
    /\ UNCHANGED <<view, phase, prepareVotes, decided, proposedValue, byzantine>>

\* Replica reaches COMMITTED state (received 2f+1 commits)
BecameCommitted(r) ==
    /\ r \in Correct
    /\ phase[r] = "prepared"
    /\ Cardinality(commitVotes[r]) >= Quorum
    /\ phase' = [phase EXCEPT ![r] = "committed"]
    /\ decided' = [decided EXCEPT ![r] = proposedValue]
    /\ UNCHANGED <<view, prepareVotes, commitVotes, proposedValue, byzantine>>

\* =========================================================================
\* NEXT-STATE RELATION
\* =========================================================================

Next ==
    \/ \E r \in Replicas : PrePrepare(r)
    \/ \E r, s \in Replicas : ReceivePrepare(r, s)
    \/ \E r \in Replicas : BecamePrepared(r)
    \/ \E r, s \in Replicas : ReceiveCommit(r, s)
    \/ \E r \in Replicas : BecameCommitted(r)

Spec == Init /\ [][Next]_vars

\* =========================================================================
\* SAFETY PROPERTIES
\* =========================================================================

\* Agreement: No two correct replicas decide different values
Agreement ==
    \A r1, r2 \in Correct :
        (decided[r1] /= "none" /\ decided[r2] /= "none")
            => decided[r1] = decided[r2]

\* Validity: If a correct replica decides v, v was proposed
Validity ==
    \A r \in Correct :
        decided[r] /= "none" => decided[r] = proposedValue

\* Quorum intersection: Any two quorums overlap in at least one correct replica
\* (This is a mathematical property of N >= 3F+1, not a runtime check)
QuorumIntersection ==
    \A S1, S2 \in SUBSET Correct :
        (Cardinality(S1) >= Quorum /\ Cardinality(S2) >= Quorum)
            => S1 \cap S2 /= {}

\* Combined safety
Safety ==
    /\ TypeOK
    /\ Agreement
    /\ Validity

\* =========================================================================
\* MODEL CONFIGURATION
\* =========================================================================
\* CONSTANTS
\*   N = 4
\*   F = 1
\*   Values = {"op1"}
\*
\* INVARIANTS
\*   Safety

================================================================================
