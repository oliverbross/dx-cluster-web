<?php
/**
 * Simple .env file loader
 * Loads environment variables from .env file
 */

if (!function_exists('loadEnv')) {
    function loadEnv($path = null) {
        if (!$path) {
            $path = dirname(__DIR__) . '/.env';
        }
        
        if (!file_exists($path)) {
            return false;
        }
        
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        foreach ($lines as $line) {
            // Skip comments
            if (strpos(trim($line), '#') === 0) {
                continue;
            }
            
            // Parse key=value pairs
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // Remove quotes if present
                if (preg_match('/^"(.*)"$/', $value, $matches)) {
                    $value = $matches[1];
                } elseif (preg_match("/^'(.*)'$/", $value, $matches)) {
                    $value = $matches[1];
                }
                
                // Set environment variable
                $_ENV[$key] = $value;
                putenv("$key=$value");
            }
        }
        
        return true;
    }
}

if (!function_exists('env')) {
    function env($key, $default = null) {
        $value = getenv($key);
        if ($value === false) {
            $value = $_ENV[$key] ?? $default;
        }
        
        // Convert string representations to proper types
        if (is_string($value)) {
            switch (strtolower($value)) {
                case 'true':
                    return true;
                case 'false':
                    return false;
                case 'null':
                    return null;
                case 'empty':
                    return '';
            }
        }
        
        return $value;
    }
}

// Load .env file
loadEnv();
?>