//! public website link and path guard.
//! Initial Rust helper code; no production implementation is implied.
pub const REPOSITORY: &str = "atto-xo.github.io";
pub const PHASE: &str = "P2";

pub fn safe_relative_path(value: &str) -> bool {
    !value.is_empty() && !value.starts_with('/')
        && !value.split('/').any(|segment| segment == ".." || segment == "." || segment.is_empty())
        && value.bytes().all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'/'))
}
#[cfg(test)] mod tests { use super::*;
    #[test] fn reject_repository_path_traversal() {
        assert!(safe_relative_path("workflows/ci.yml"));
        assert!(!safe_relative_path("../secrets.txt"));
        assert!(!safe_relative_path("/var/tmp"));
    }
}
