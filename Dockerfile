# Use the official Node.js image as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Ensure the correct ownership and permissions
RUN chown -R node:node /app

# Switch to the non-root 'user' user
USER node

# Expose the port the app runs on
EXPOSE 7860

# Set environment variable to disable opening browser
ENV BROWSER=none

# Start the Vite development server with specific configurations
CMD ["npm", "run", "dev", "--", "--host", "--port", "7860", "--strictPort"]
