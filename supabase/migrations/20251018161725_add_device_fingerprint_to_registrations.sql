-- Add device_fingerprint column to device_registrations if missing
-- This column should have been created in 20250903000002 but may not be on production

-- Check and add column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'device_registrations'
        AND column_name = 'device_fingerprint'
    ) THEN
        ALTER TABLE public.device_registrations
        ADD COLUMN device_fingerprint text;

        COMMENT ON COLUMN device_registrations.device_fingerprint IS
            'Device fingerprint for pairing flow. Links registration to stable device identity.';

        RAISE NOTICE 'Added device_fingerprint column to device_registrations';
    ELSE
        RAISE NOTICE 'device_fingerprint column already exists in device_registrations';
    END IF;
END $$;
