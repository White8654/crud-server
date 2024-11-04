# Use the official Ubuntu image as the base
FROM ubuntu:22.04

# Set the working directory inside the container
WORKDIR /app

# Install required dependencies
RUN apt-get update && apt-get install -y \
    git \
    openssh-client \
    curl \
    jq \
    python3 \
    bash \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install the new Salesforce CLI
RUN npm install -g @salesforce/cli

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