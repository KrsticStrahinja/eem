-- PostgreSQL RPC funkcija za efikasan update rezervacije u JSONB array-u
-- Ova funkcija treba da se izvršava u Supabase SQL Editor-u

CREATE OR REPLACE FUNCTION update_reservation_in_array(
    accommodation_id UUID,
    reservation_id TEXT,
    updated_reservation JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_reservation JSONB;
    updated_reservations JSONB;
BEGIN
    -- Update rezervacije direktno u JSONB array-u bez čitanja celog array-a
    UPDATE accommodation 
    SET 
        reservations = (
            SELECT jsonb_agg(
                CASE 
                    WHEN elem->>'id' = reservation_id 
                    THEN updated_reservation 
                    ELSE elem 
                END
            )
            FROM jsonb_array_elements(COALESCE(reservations, '[]'::jsonb)) AS elem
        ),
        updated_at = NOW()
    WHERE id = accommodation_id;
    
    -- Vrati updateovanu rezervaciju
    SELECT updated_reservation INTO result_reservation;
    
    RETURN result_reservation;
END;
$$;

-- Dodeli potrebne permisije
GRANT EXECUTE ON FUNCTION update_reservation_in_array TO authenticated;
GRANT EXECUTE ON FUNCTION update_reservation_in_array TO anon;