import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'

const WS_URL = import.meta.env.VITE_WS_URL
  ? `${import.meta.env.VITE_WS_URL}/ws`
  : `ws://${window.location.hostname}:4000/ws`

export function useWebSocket() {
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const { setWsConnected, setWsClientId, addLiveUpdate, updateWorkflowInList, addNotification } = useStore()

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setWsConnected(true)
        clearTimeout(reconnectTimer.current)
        ws.send(JSON.stringify({ type: 'SUBSCRIBE', topics: ['WORKFLOWS', 'STATS', 'SYSTEM'] }))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          addLiveUpdate(msg)

          if (msg.type === 'CONNECTED') {
            setWsClientId(msg.clientId)
          } else if (msg.type === 'WORKFLOW_UPDATE') {
            updateWorkflowInList(msg.workflowId, {
              status: msg.status,
              currentStep: msg.currentStep,
              totalSteps: msg.totalSteps,
            })
            addNotification({
              type: msg.status === 'FAILED' ? 'error' : msg.status === 'COMPLETED' ? 'success' : 'info',
              title: `Workflow ${msg.status.toLowerCase().replace('_', ' ')}`,
              message: msg.name || `Workflow ${msg.workflowId?.slice(0, 8)}`,
            })
          }
        } catch (e) {
          console.warn('[WS] Message parse error:', e)
        }
      }

      ws.onclose = () => {
        setWsConnected(false)
        reconnectTimer.current = setTimeout(connect, 4000)
      }

      ws.onerror = (err) => {
        console.warn('[WS] Connection error — BFF server may not be running')
        ws.close()
      }
    } catch (e) {
      console.warn('[WS] Failed to connect:', e.message)
      reconnectTimer.current = setTimeout(connect, 5000)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { send }
}
