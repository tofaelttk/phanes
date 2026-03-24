use std::io::{self, BufRead, Write};

fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut out = stdout.lock();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };
        let response = aeos_bulletproofs::process_json_command(&line);
        writeln!(out, "{}", response).ok();
        out.flush().ok();
    }
}
