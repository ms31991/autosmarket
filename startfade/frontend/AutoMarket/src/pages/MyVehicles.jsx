import "./MyVehicles.css";
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VehicleCard } from './VehicleCard'
import { getClerkToken } from '../services/clerkToken'
import { API_BASE } from '../config/api'

export const MyVehicles = () => {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ==========================================
  // TOKEN (për ta kaluar te VehicleCard, p.sh.
  // për upload/preview foto që kërkon auth atje)
  // ==========================================

  const [token, setToken] = useState(null)

  const navigate = useNavigate()

  // ==========================================
  // GET MY VEHICLES
  // ==========================================

  async function fetchMyVehicles() {
    try {
      setLoading(true)
      setError('')

      const currentToken = await getClerkToken()

      if (!currentToken) {
        setError('Duhet të kyçeni fillimisht.')
        setLoading(false)
        return
      }

      setToken(currentToken)

      const response = await fetch(
        `${API_BASE}/Vehicles/my`,
        {
          method: 'GET',
          headers: {
            Authorization:
              `Bearer ${currentToken}`,
          },
        }
      )

      console.log(
        'MY VEHICLES STATUS:',
        response.status
      )

      const responseText =
        await response.text()

      console.log(
        'MY VEHICLES RESPONSE:',
        responseText
      )

      if (!response.ok) {
        throw new Error(
          `Veturat nuk u morën. Status: ${response.status}`
        )
      }

      const data =
        responseText
          ? JSON.parse(responseText)
          : []

      console.log(
        'MY VEHICLES DATA:',
        data
      )

      setVehicles(data)

    } catch (err) {
      console.error(
        'MY VEHICLES ERROR:',
        err
      )

      setError(
        err.message ||
        'Ndodhi një gabim.'
      )

    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // LOAD VEHICLES
  // ==========================================

  useEffect(() => {
    fetchMyVehicles()
  }, [])

  // ==========================================
  // DELETE VEHICLE
  // ==========================================

  async function handleDelete(id) {
    const confirmed =
      window.confirm(
        'A jeni i sigurt që dëshironi ta fshini këtë veturë?'
      )

    if (!confirmed) {
      return
    }

    try {
      setError('')

      const currentToken = await getClerkToken()

      if (!currentToken) {
        setError(
          'Duhet të kyçeni fillimisht.'
        )
        return
      }

      const response =
        await fetch(
          `${API_BASE}/Vehicles/${id}`,
          {
            method: 'DELETE',

            headers: {
              Authorization:
                `Bearer ${currentToken}`,
            },
          }
        )

      console.log(
        'DELETE VEHICLE STATUS:',
        response.status
      )

      const responseText =
        await response.text()

      console.log(
        'DELETE VEHICLE RESPONSE:',
        responseText
      )

      if (!response.ok) {
        throw new Error(
          `Vetura nuk u fshi. Status: ${response.status}`
        )
      }

      // Largoje menjëherë nga UI
      setVehicles((previousVehicles) =>
        previousVehicles.filter(
          (vehicle) =>
            vehicle.id !== id
        )
      )

    } catch (err) {
      console.error(
        'DELETE VEHICLE ERROR:',
        err
      )

      setError(
        err.message ||
        'Ndodhi një gabim gjatë fshirjes.'
      )
    }
  }

  // ==========================================
  // EDIT VEHICLE
  // ==========================================

  function handleEdit(id) {
    navigate(
      `/edit-vehicle/${id}`
    )
  }

  // ==========================================
  // VIEW VEHICLE
  // ==========================================

  function handleView(id) {
    navigate(
      `/vehicles/${id}`
    )
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="my-vehicles-page">

      <button
        type="button"
        className="my-vehicles-back-btn"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      {/* =====================================
          PAGE HEADER
      ===================================== */}

      <div className="my-vehicles-header">
        <div>
          <h1>
            My Vehicles
          </h1>

          <p>
            View and manage your vehicles here.
          </p>
        </div>

        <button
          type="button"
          className="my-vehicles-add-btn"
          onClick={() =>
            navigate('/add-vehicle')
          }
        >
          + Add Vehicle
        </button>
      </div>

      {/* =====================================
          ERROR
      ===================================== */}

      {error && (
        <div
          style={{
            padding: '12px 15px',
            marginBottom: '20px',
            border: '1px solid #ffb3b3',
            backgroundColor: '#fff5f5',
            color: '#d00000',
            borderRadius: '8px',
          }}
        >
          {error}
        </div>
      )}

      {/* =====================================
          LOADING
      ===================================== */}

      {loading ? (

        <div
          style={{
            padding: '50px 0',
            textAlign: 'center',
            color: '#666',
          }}
        >
          Loading...
        </div>

      ) : vehicles.length === 0 ? (

        /* ====================================
           NO VEHICLES
        ==================================== */

        <div
          style={{
            textAlign: 'center',
            padding: '70px 20px',
            border: '1px solid #eee',
            borderRadius: '12px',
            backgroundColor: '#fafafa',
          }}
        >

          <h2>
            You have no vehicles
          </h2>

          <p
            style={{
              color: '#666',
              marginBottom: '25px',
            }}
          >
            Add your first vehicle to publish it on AutoMarket.
          </p>

          <button
            onClick={() =>
              navigate('/add-vehicle')
            }
            style={{
              padding: '12px 20px',
              backgroundColor: '#111',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
            }}
          >
            Add Your First Vehicle
          </button>

        </div>

      ) : (

        /* ====================================
           VEHICLES
        ==================================== */

        <div>

          <h2
            style={{
              marginBottom: '20px',
            }}
          >
            My Vehicles ({vehicles.length})
          </h2>

          {/* ==================================
              VEHICLE CARDS
          ================================== */}

          <div className="vehicle-grid">

            {vehicles.map((vehicle) => (

              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                token={token}

                onDelete={() =>
                  handleDelete(
                    vehicle.id
                  )
                }

                onEdit={() =>
                  handleEdit(
                    vehicle.id
                  )
                }

                onView={() =>
                  handleView(
                    vehicle.id
                  )
                }
              />

            ))}

          </div>

        </div>

      )}

    </div>
  )
}