import "./AdminVehicleModels.css";
import { useEffect, useState } from 'react'
import { API_BASE } from '../../config/api'

export const AdminVehicleModels = () => {
  const [models, setModels] = useState([])
  const [brands, setBrands] = useState([])

  const [name, setName] = useState('')
  const [brandId, setBrandId] = useState('')

  const [editingId, setEditingId] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const API_URL = `${API_BASE}/VehicleModels`
  const BRANDS_URL = `${API_BASE}/Brands`

  // ==========================================
  // GET MODELS
  // ==========================================

  async function fetchModels() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(API_URL)

      if (!response.ok) {
        throw new Error('Modelet nuk u morën.')
      }

      const data = await response.json()

      setModels(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // GET BRANDS
  // ==========================================

  async function fetchBrands() {
    try {
      const response = await fetch(BRANDS_URL)

      if (!response.ok) {
        throw new Error('Brands nuk u morën.')
      }

      const data = await response.json()

      setBrands(data)
    } catch (err) {
      setError(err.message)
    }
  }

  // ==========================================
  // LOAD DATA
  // ==========================================

  useEffect(() => {
    fetchModels()
    fetchBrands()
  }, [])

  // ==========================================
  // ADD / UPDATE
  // ==========================================

  async function handleSubmit(e) {
    e.preventDefault()

    setError('')

    if (!name.trim()) {
      setError('Model name është i detyrueshëm.')
      return
    }

    if (!brandId) {
      setError('Duhet të zgjedhësh Brand.')
      return
    }

    try {
      const token = localStorage.getItem('token')

      const body = {
        name: name.trim(),
        brandId: Number(brandId),
      }

      let response

      // ======================================
      // UPDATE
      // ======================================

      if (editingId) {
        response = await fetch(`${API_URL}/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: editingId,
            ...body,
          }),
        })
      }

      // ======================================
      // ADD
      // ======================================

      else {
        response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })
      }

      if (!response.ok) {
        const errorText = await response.text()

        console.error('MODEL RESPONSE:', errorText)

        throw new Error(
          editingId
            ? 'Model nuk u përditësua.'
            : 'Model nuk u shtua.'
        )
      }

      resetForm()

      await fetchModels()
    } catch (err) {
      console.error(err)

      setError(err.message)
    }
  }

  // ==========================================
  // EDIT
  // ==========================================

  function handleEdit(model) {
    setEditingId(model.id)

    setName(model.name)

    setBrandId(
      model.brandId?.toString() || ''
    )

    setError('')
  }

  // ==========================================
  // DELETE
  // ==========================================

  async function handleDelete(id) {
    const confirmed = window.confirm(
      'A jeni i sigurt që dëshironi ta fshini këtë model?'
    )

    if (!confirmed) {
      return
    }

    try {
      setError('')

      const token = localStorage.getItem('token')

      const response = await fetch(
        `${API_URL}/${id}`,
        {
          method: 'DELETE',

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Model nuk u fshi.')
      }

      await fetchModels()
    } catch (err) {
      setError(err.message)
    }
  }

  // ==========================================
  // RESET
  // ==========================================

  function resetForm() {
    setEditingId(null)
    setName('')
    setBrandId('')
    setError('')
  }

  // ==========================================
  // GET BRAND NAME
  // ==========================================

  function getBrandName(model) {
    if (model.brand?.name) {
      return model.brand.name
    }

    const brand = brands.find(
      (b) => b.id === model.brandId
    )

    return brand?.name || 'Unknown'
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="admin-vehicle-models-page">

      <h1>Vehicle Models</h1>

      <p>
        Këtu Admin mund të shtojë,
        ndryshojë dhe fshijë modelet e
        automjeteve.
      </p>

      {/* ERROR */}

      {error && (
        <div>
          {error}
        </div>
      )}

      {/* FORM */}

      <form onSubmit={handleSubmit}>

        <div>
          <label>
            Model Name
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="Example: Golf 7"
          />
        </div>

        <div>
          <label>
            Brand
          </label>

          <select
            value={brandId}
            onChange={(e) =>
              setBrandId(e.target.value)
            }
          >

            <option value="">
              Select Brand
            </option>

            {brands.map((brand) => (
              <option
                key={brand.id}
                value={brand.id}
              >
                {brand.name}
              </option>
            ))}

          </select>
        </div>

        <button type="submit" className="btn-save">

          {editingId
            ? 'Update Model'
            : 'Add Model'}

        </button>

        {editingId && (
          <button
            type="button"
            onClick={resetForm}
          >
            Cancel
          </button>
        )}

      </form>

      <hr />

      {/* LIST */}

      <h2>All Vehicle Models</h2>

      {loading ? (
        <p>Loading...</p>
      ) : models.length === 0 ? (
        <p>Nuk ka modele.</p>
      ) : (

        <table>

          <thead>

            <tr>
              <th>ID</th>
              <th>Model</th>
              <th>Brand</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            {models.map((model) => (

              <tr key={model.id}>

                <td>
                  {model.id}
                </td>

                <td>
                  {model.name}
                </td>

                <td>
                  {getBrandName(model)}
                </td>

                <td>

                  <button
                    type="button"
                    className="btn-edit"
                    onClick={() =>
                      handleEdit(model)
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() =>
                      handleDelete(model.id)
                    }
                  >
                    Delete
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      )}

    </div>
  )
}