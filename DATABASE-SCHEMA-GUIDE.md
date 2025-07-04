# Database Schema Management Guide

## Critical Learning: Schema vs Database Reality

### The Problem We Solved (June 26, 2025)
- **Issue**: Image upload system failing with "column 'storage_bucket' does not exist"
- **Root Cause**: Drizzle ORM schema included columns that weren't actually created in the physical database
- **Impact**: Complete upload system failure despite code appearing correct

### The Solution
- **Immediate Fix**: Disabled non-existent columns in `shared/schema.ts`
- **Result**: Upload system immediately restored to working condition
- **Key Insight**: Schema definitions must match actual database structure exactly

## Current message_attachments Table Structure

### Columns That EXIST in Database:
```sql
id                 SERIAL PRIMARY KEY
message_id         INTEGER NOT NULL
clinic_id          INTEGER NOT NULL
file_name          VARCHAR(255) NOT NULL
file_type          VARCHAR(100) NOT NULL  -- MIME type
file_size          INTEGER                 -- bytes
file_url           TEXT                    -- URL do arquivo
whatsapp_media_id  VARCHAR(255)           -- WhatsApp integration
whatsapp_media_url TEXT                   -- WhatsApp URL
thumbnail_url      TEXT                   -- Preview URL
duration           INTEGER                -- audio/video seconds
width              INTEGER                -- image/video width
height             INTEGER                -- image/video height
created_at         TIMESTAMP DEFAULT NOW()
```

### Columns That DON'T EXIST (Disabled in Schema):
```sql
-- THESE ARE COMMENTED OUT IN shared/schema.ts:
-- storage_bucket      VARCHAR(100)
-- storage_path        VARCHAR(500)  
-- public_url          TEXT
-- signed_url          TEXT
-- signed_url_expires  TIMESTAMP
```

## Upload System Architecture (Working)

### Current Flow:
1. **File Upload**: Files uploaded to Supabase Storage
2. **URL Generation**: Signed URLs created for secure access
3. **Database Record**: Uses ONLY existing columns:
   - `file_url` contains the signed URL from Supabase
   - `file_name`, `file_type`, `file_size` for metadata
   - No Supabase Storage specific columns used

### Code Implementation:
```typescript
// In server/postgres-storage.ts - createAttachment method
const attachmentData = {
  message_id: attachment.message_id,
  clinic_id: attachment.clinic_id,
  file_name: attachment.file_name,
  file_type: attachment.file_type,
  file_size: attachment.file_size,
  file_url: attachment.file_url || attachment.public_url  // Uses signed URL
};
// NO storage_bucket, storage_path, etc.
```

## Best Practices to Prevent Future Issues

### 1. Schema Verification Before Deployment
```bash
# Always verify actual database structure
npx tsx check-drizzle-structure.ts
```

### 2. Column Addition Process
If adding new columns in the future:
1. **First**: Create columns in actual database
2. **Then**: Update schema in `shared/schema.ts`
3. **Finally**: Update code to use new columns
4. **Never**: Update schema without database changes

### 3. Schema Documentation
- Keep this document updated with actual database structure
- Comment out planned/future columns in schema
- Document why columns are disabled

### 4. Testing Protocol
Before any schema changes:
1. Test upload functionality
2. Verify database queries work
3. Check that no "column does not exist" errors occur

## Migration Strategy (If Needed in Future)

### To Add Supabase Storage Columns:
1. **Step 1**: Add columns to database via SQL:
   ```sql
   ALTER TABLE message_attachments ADD COLUMN storage_bucket VARCHAR(100);
   ALTER TABLE message_attachments ADD COLUMN storage_path VARCHAR(500);
   -- etc.
   ```

2. **Step 2**: Verify columns exist via database query

3. **Step 3**: Uncomment columns in `shared/schema.ts`

4. **Step 4**: Test upload system thoroughly

5. **Step 5**: Update this documentation

### Never Do This:
- ❌ Update schema first, then try to add database columns
- ❌ Assume schema and database are synchronized
- ❌ Deploy without testing upload functionality

## Current Working Status ✅

- ✅ Image uploads working perfectly
- ✅ Files stored in Supabase Storage
- ✅ Signed URLs generated correctly  
- ✅ Database records created successfully
- ✅ Evolution API integration functional
- ✅ No schema/database mismatches

## Monitoring and Maintenance

### Regular Checks:
1. Upload functionality test (monthly)
2. Database schema verification (before any changes)
3. Error log monitoring for column-related issues

### Warning Signs:
- "column does not exist" errors
- Upload failures after schema changes
- Drizzle ORM query errors

Remember: **The database is the source of truth, not the schema file.**