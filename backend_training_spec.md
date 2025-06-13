# Training Corrections Backend Specification

## Training Endpoint: `/debate/training`

### POST Request
```json
{
  "messageId": "1234567890",
  "correction": "The correct response should mention that those who die before 40 go to heaven",
  "userEmail": "syedahmadfahmybinsyedsalim@gmail.com",
  "timestamp": "2025-01-13T10:30:00.000Z"
}
```

### Response
```json
{
  "success": true,
  "correctionId": 1
}
```

### Implementation
1. Verify user is in authorized trainers list
2. Insert correction into `training_corrections` table
3. Use corrections to improve future AI responses

### Authorized Trainers
Currently only: `syedahmadfahmybinsyedsalim@gmail.com`