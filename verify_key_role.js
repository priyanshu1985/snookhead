
import dotenv from 'dotenv';
dotenv.config();

function parseJwt (token) {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('Key found:', !!key);
    if (!key) {
        console.error('No SUPABASE_SERVICE_ROLE_KEY in .env');
        process.exit(1);
    }
    
    // Polyfill atob for node if needed (Node 16+ has global atob)
    if (typeof atob === 'undefined') {
        global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
    }

    const payload = parseJwt(key);
    console.log('Token Role:', payload.role);
    console.log('Token ISS:', payload.iss);
    
} catch (e) {
    console.error('Error parsing token:', e.message);
}
