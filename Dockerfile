# Use the official Node.js image as the base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Install required dependencies
RUN apk add --no-cache git openssh curl jq python3 bash

# Install the new Salesforce CLI
RUN npm install @salesforce/cli --global

# Add sf to PATH
ENV PATH="/usr/local/share/.config/yarn/global/node_modules/@salesforce/cli/bin:${PATH}"

# Create necessary directory for SF CLI
RUN mkdir -p /root/.local/share/sfdx

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Next.js app
RUN npm run build

# Expose the port the app will run on
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start"]