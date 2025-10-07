#!/bin/bash
# POPサーバのテストスクリプト

echo "=== POP3 Test Script ==="
echo ""

# POP3接続テスト
echo "Testing POP3 connection (port 110)..."
(
  sleep 1
  echo "USER testuser"
  sleep 1
  echo "PASS testpass"
  sleep 1
  echo "STAT"
  sleep 1
  echo "LIST"
  sleep 1
  echo "QUIT"
) | telnet localhost 110

echo ""
echo "=== Test Complete ==="
