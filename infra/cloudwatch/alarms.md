# CloudWatch Alarms

## Alarm Thresholds

| Metric        | Threshold | Duration | Action          |
|---------------|-----------|----------|-----------------|
| CPU Usage      | > 80%     | 5 min    | SNS Notification |
| Disk Usage     | > 85%     | 5 min    | SNS Notification |
| Memory Usage   | > 90%     | 5 min    | SNS Notification |

## SNS Alarm Configuration

Alarms trigger SNS notifications to the configured topic.
Subscribe to the SNS topic to receive alerts via email, SMS, or other endpoints.

### Example Alarm Actions

- **OKHwadang-Alerts**: Primary notification topic for all infrastructure alerts

## Alarm Evaluation

- CloudWatch evaluates metrics every 1 minute
- Alarm triggers after threshold is breached for the specified duration
- Recovery notifications sent when metrics return to normal