-- One OIMO account belongs to at most one store (owner or staff), enforced by the database, not only by checks in code.
CREATE UNIQUE INDEX member_account ON members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX sales_photo ON sales(photo_id);
CREATE INDEX photos_member ON photos(member_id,created_at);
