window.VIGILX_CONFIG = {
    // Dynamically choose backend API URL depending on context
    // If the frontend is running locally, use the local Python backend
    // Otherwise, it must use the Render.com backend URL
    apiUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://vigilx-api.onrender.com' // Replace with your actual Render URL later
};
