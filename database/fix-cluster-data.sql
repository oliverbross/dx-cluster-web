-- Fix cluster ID 5 to be OM0RX instead of K3LR
-- This ensures the database matches the API response

UPDATE dx_clusters 
SET 
    name = 'OM0RX Cluster',
    host = 'cluster.om0rx.com',
    description = 'OM0RX Personal DX Cluster'
WHERE id = 5;

-- Verify the fix
SELECT id, name, host, port, description FROM dx_clusters ORDER BY id;