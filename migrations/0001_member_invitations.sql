CREATE TABLE member_invitations (
 token_hash TEXT PRIMARY KEY,
 member_id TEXT NOT NULL REFERENCES members(id),
 expires_at TEXT NOT NULL,
 used_at TEXT
);
CREATE INDEX invitation_member ON member_invitations(member_id);
