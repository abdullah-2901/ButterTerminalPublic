# WebSocket Debugging Guide

## Changes Made
We removed the message queue system and implemented immediate processing of WebSocket messages.

## What to Check in Browser Console

### 1. WebSocket Connection
Look for these messages:
- `Creating WebSocket connection to: wss://...`
- `WebSocket initial readyState: 0` (CONNECTING)
- `WebSocket connected successfully to wss://...`
- `WebSocket readyState: 1` (OPEN)

### 2. Subscription Messages
Look for:
- `Sending subscription message: {action: 'subscribe', channelName: '...'}`
- `Successfully subscribed to channel: ...`
- `Subscribing to token channel: {action: 'subscribe', channelName: 'pumpswap', maxTokens: 50}`

### 3. Message Reception
Look for:
- `WebSocket message received: ...`
- `Processing message #X: ...`
- `Parsed message: {...}`

### 4. Price Updates
Look for:
- `Calling onPriceUpdate with ...`
- `Emitting previous candle: ...`
- `Emitting current candle: ...`

## Common Issues to Check

### If no messages are received:
1. Check if WebSocket is connected (readyState: 1)
2. Check if subscription was successful
3. Check network tab for WebSocket connection

### If messages received but not processed:
1. Check if `onPriceUpdate callback` is defined (not undefined)
2. Check if message format matches expected formats
3. Look for "Received unknown message format" logs

### If candles not updating:
1. Check if `Calling onPriceUpdate` messages appear
2. Check if the component's `handlePriceUpdate` function is being called
3. Check if the contract address matches

## Next Steps
1. Open browser console
2. Refresh the page
3. Look for the debug messages above
4. Share the console output to identify the issue

