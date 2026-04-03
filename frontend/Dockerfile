# Use the official Nginx image as the base
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the frontend files to the Nginx html directory
COPY . /usr/share/nginx/html

# Replace default Nginx configuration (optional, if custom routing is needed)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (to be mapped to 3000 in compose)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
