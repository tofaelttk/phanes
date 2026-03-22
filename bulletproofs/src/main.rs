use aeos_bulletproofs::process_json_command;
use std::io::{self, BufRead, Write};

fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut out = stdout.lock();
    for line in stdin.lock().lines() {
        match line {
            Ok(input) => { writeln!(out, "{}", process_json_command(&input)).unwrap(); out.flush().unwrap(); }
            Err(e) => { eprintln!("Error: {e}"); break; }
        }
    }
}
