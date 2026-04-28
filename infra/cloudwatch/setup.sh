#!/bin/bash
set -e

# CloudWatch Agent Setup Script for EC2
# Run as root or with sudo

CW_AGENT_URL="https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb"
CONFIG_PATH="/opt/cloudwatch-agent/cloudwatch-config.json"
CW_CONFIG_DIR="/opt/cloudwatch-agent"

echo "==> Installing CloudWatch Agent..."

# Download and install CloudWatch Agent
wget -q "$CW_AGENT_URL" -O /tmp/amazon-cloudwatch-agent.deb
dpkg -i /tmp/amazon-cloudwatch-agent.deb
rm /tmp/amazon-cloudwatch-agent.deb

# Create config directory
mkdir -p "$CW_CONFIG_DIR"

# Copy configuration (assumes cloudwatch-config.json is in the same directory)
if [ -f "$(dirname "$0")/cloudwatch-config.json" ]; then
    cp "$(dirname "$0")/cloudwatch-config.json" "$CONFIG_PATH"
    echo "==> CloudWatch config copied to $CONFIG_PATH"
else
    echo "ERROR: cloudwatch-config.json not found in $(dirname "$0")"
    exit 1
fi

# Create cwagent user if it doesn't exist
if ! id cwagent &>/dev/null; then
    useradd -r -s /bin/false cwagent
    echo "==> Created cwagent user"
fi

# Start CloudWatch Agent
/opt/amazon/cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a start
echo "==> CloudWatch Agent started"

# Verify agent is running
/opt/amazon/cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status

echo "==> CloudWatch Agent setup complete"