import "./Messages.css";
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getClerkToken } from '../services/clerkToken'
import { createChatConnection } from '../services/signalRService'
import { ChatWindow } from './ChatWindow'
import { API_BASE } from '../config/api'

export const Messages = () => {
  const { conversationId } = useParams()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState(null)

  const activeConversationId = conversationId
    ? Number(conversationId)
    : null

  // ==========================================
  // GET MY CONVERSATIONS
  // ==========================================

  async function fetchConversations() {
    const token = await getClerkToken()

    if (!token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        `${API_BASE}/Chat/conversations`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        console.error(
          'FETCH CONVERSATIONS FAILED:',
          response.status
        )
        return
      }

      const data = await response.json()
      setConversations(data)

    } catch (err) {
      console.error('FETCH CONVERSATIONS ERROR:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  // ==========================================
  // SIGNALR — LIDHU PËR CHAT REAL-TIME
  // ==========================================

  useEffect(() => {
    let conn

    async function startConnection() {
      const token = await getClerkToken()

      if (!token) {
        console.error('Clerk token nuk u gjet.')
        return
      }

      conn = createChatConnection()

      conn.on('ReceiveMessage', () => {
        fetchConversations()
      })

      try {
        await conn.start()

        console.log(
          'Chat u lidh me sukses.'
        )

        setConnection(conn)

      } catch (err) {
        console.error(
          'Chat SignalR connection error:',
          err
        )
      }
    }

    startConnection()

    return () => {
      if (conn) {
        conn.off('ReceiveMessage')
        conn.stop()
      }
    }
  }, [])

  // ==========================================
  // SELECT CONVERSATION
  // ==========================================

  function handleSelectConversation(id) {
    navigate(`/messages/${id}`)

    setConversations((prev) =>
      prev.map((c) =>
        c.conversationId === id
          ? { ...c, unreadCount: 0 }
          : c
      )
    )
  }

  // ==========================================
  // TIME AGO
  // ==========================================

  function timeAgo(dateString) {
    if (!dateString) return ''

    const seconds = Math.floor(
      (new Date() - new Date(dateString)) / 1000
    )

    if (seconds < 60) return 'tani'
    if (seconds < 3600)
      return `${Math.floor(seconds / 60)}m`

    if (seconds < 86400)
      return `${Math.floor(seconds / 3600)}h`

    return `${Math.floor(seconds / 86400)}d`
  }

  const activeConversation = conversations.find(
    (c) =>
      c.conversationId === activeConversationId
  )

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="messages-page">

      {/* SIDEBAR */}

      <div
        style={{
          width: '320px',
          borderRight: '1px solid #eee',
          overflowY: 'auto',
        }}
      >

        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #eee',
            fontWeight: '700',
            fontSize: '17px',
          }}
        >
          Messages
        </div>

        {loading ? (

          <div
            style={{
              padding: '20px',
              color: '#999',
              textAlign: 'center',
            }}
          >
            Loading...
          </div>

        ) : conversations.length === 0 ? (

          <div
            style={{
              padding: '20px',
              color: '#999',
              textAlign: 'center',
            }}
          >
            You have no conversations yet.
          </div>

        ) : (

          conversations.map((c) => (

            <div
              key={c.conversationId}
              onClick={() =>
                handleSelectConversation(
                  c.conversationId
                )
              }
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid #f5f5f5',
                cursor: 'pointer',
                backgroundColor:
                  c.conversationId === activeConversationId
                    ? '#f5f5f5'
                    : '#fff',
              }}
            >

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >

                <strong
                  style={{
                    fontSize: '14px',
                  }}
                >
                  {c.otherUserName}
                </strong>

                <span
                  style={{
                    fontSize: '11px',
                    color: '#999',
                  }}
                >
                  {timeAgo(c.lastMessageAt)}
                </span>

              </div>

              {c.vehicleName && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#777',
                    marginBottom: '2px',
                  }}
                >
                  {c.vehicleName}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >

                <span
                  style={{
                    fontSize: '13px',
                    color: '#666',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '200px',
                  }}
                >
                  {c.lastMessage ||
                    "Ende s'ka mesazhe"}
                </span>

                {c.unreadCount > 0 && (
                  <span
                    style={{
                      backgroundColor: '#d00000',
                      color: '#fff',
                      borderRadius: '50%',
                      minWidth: '18px',
                      height: '18px',
                      fontSize: '11px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                    }}
                  >
                    {c.unreadCount}
                  </span>
                )}

              </div>

            </div>
          ))
        )}

      </div>

      {/* CHAT WINDOW */}

      <ChatWindow
        conversationId={activeConversationId}
        otherUserName={
          activeConversation?.otherUserName || ''
        }
        connection={connection}
      />

    </div>

  )
}