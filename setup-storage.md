# Supabase Storage Setup Guide

## Step 1: Create the Storage Bucket

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: `xzvalmxbbozhbiamsnzy`

2. **Go to Storage Section**
   - Click on "Storage" in the left sidebar

3. **Create New Bucket**
   - Click "New Bucket"
   - **Bucket name**: `documents`
   - **Public bucket**: `No` (keep private)
   - Click "Create bucket"

## Step 2: Configure Storage Policies

1. **Go to Storage > Policies**
   - Click on the "documents" bucket
   - Click "New Policy"

2. **Create Upload Policy**
   - **Policy name**: `Users can upload their own documents`
   - **Allowed operation**: `INSERT`
   - **Policy definition**: `auth.uid() = owner`
   - Click "Save"

3. **Create Download Policy**
   - **Policy name**: `Users can download their own documents`
   - **Allowed operation**: `SELECT`
   - **Policy definition**: `auth.uid() = owner`
   - Click "Save"

4. **Create Delete Policy**
   - **Policy name**: `Users can delete their own documents`
   - **Allowed operation**: `DELETE`
   - **Policy definition**: `auth.uid() = owner`
   - Click "Save"

## Step 3: Test the Setup

After running the database setup script and creating the storage bucket, test:

1. **Refresh your application** (http://localhost:8080/)
2. **Try uploading a document**
3. **Check if errors are resolved**

## Troubleshooting

- **If you get "Bucket not found"**: Make sure the bucket name is exactly `documents`
- **If you get "Permission denied"**: Check that the storage policies are set correctly
- **If tables still don't exist**: Make sure you ran the SQL setup script in the SQL Editor

