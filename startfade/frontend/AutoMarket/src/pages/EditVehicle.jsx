import "./EditVehicle.css";
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getClerkToken } from '../services/clerkToken'
import { mediaUrl } from '../utils/mediaUrl'
import { API_BASE } from '../config/api'
import { compressImageFile } from '../utils/compressImage'

export const EditVehicle = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  // =====================================================
  // DROPDOWN DATA
  // =====================================================

  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [models, setModels] = useState([])
  const [bodyTypes, setBodyTypes] = useState([])
  const [fuelTypes, setFuelTypes] = useState([])
  const [transmissions, setTransmissions] = useState([])
  const [driveTypes, setDriveTypes] = useState([])
  const [conditions, setConditions] = useState([])
  const [colors, setColors] = useState([])
  const [cities, setCities] = useState([])
  const [listingTypes, setListingTypes] = useState([])

  // =====================================================
  // VEHICLE IMAGES
  // =====================================================

  const [images, setImages] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // =====================================================
  // FORM
  // =====================================================

  const [formData, setFormData] = useState({
    categoryId: '',
    brandId: '',
    modelId: '',
    bodyTypeId: '',
    fuelTypeId: '',
    transmissionId: '',
    driveTypeId: '',
    conditionId: '',
    colorId: '',
    cityId: '',
    listingTypeId: '',

    price: '',
    year: '',
    mileage: '',

    engine: '',
    engineCC: '',

    powerHP: '',
    powerKW: '',

    cylinders: '',
    doors: '',
    seats: '',

    vin: '',
  })

  // =====================================================
  // UI STATE
  // =====================================================

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    checkAuthAndLoad()
  }, [id])

  async function checkAuthAndLoad() {
    const token = await getClerkToken()

    if (!token) {
      setError('Nuk jeni të kyçur.')
      setLoading(false)
      return
    }

    loadData()
  }

  // =====================================================
  // LOAD VEHICLE + DROPDOWNS + IMAGES
  // =====================================================

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      // =================================================
      // GET VEHICLE
      // =================================================

      const vehicleResponse = await fetch(
        `${API_BASE}/Vehicles/${id}`
      )

      const vehicleText = await vehicleResponse.text()

      console.log(
        'GET VEHICLE STATUS:',
        vehicleResponse.status
      )

      console.log(
        'GET VEHICLE RESPONSE:',
        vehicleText
      )

      if (!vehicleResponse.ok) {
        throw new Error('Vehicle nuk u gjet.')
      }

      const vehicle = JSON.parse(vehicleText)

      // =================================================
      // GET DROPDOWNS
      // =================================================

      const endpoints = [
        {
          key: 'categories',
          url: `${API_BASE}/VehicleCategories`,
        },
        {
          key: 'brands',
          url: `${API_BASE}/Brands`,
        },
        {
          key: 'models',
          url: `${API_BASE}/VehicleModels`,
        },
        {
          key: 'bodyTypes',
          url: `${API_BASE}/BodyTypes`,
        },
        {
          key: 'fuelTypes',
          url: `${API_BASE}/FuelTypes`,
        },
        {
          key: 'transmissions',
          url: `${API_BASE}/Transmissions`,
        },
        {
          key: 'driveTypes',
          url: `${API_BASE}/DriveTypes`,
        },
        {
          key: 'conditions',
          url: `${API_BASE}/Conditions`,
        },
        {
          key: 'colors',
          url: `${API_BASE}/Colors`,
        },
        {
          key: 'cities',
          url: `${API_BASE}/Cities`,
        },
        {
          key: 'listingTypes',
          url: `${API_BASE}/ListingTypes`,
        },
      ]

      const responses = await Promise.all(
        endpoints.map((item) =>
          fetch(item.url)
        )
      )

      for (const response of responses) {
        if (!response.ok) {
          throw new Error(
            `Gabim gjatë marrjes së dropdowns. Status: ${response.status}`
          )
        }
      }

      const data = await Promise.all(
        responses.map((response) =>
          response.json()
        )
      )

      // =================================================
      // SET DROPDOWNS
      // =================================================

      setCategories(data[0])
      setBrands(data[1])
      setModels(data[2])
      setBodyTypes(data[3])
      setFuelTypes(data[4])
      setTransmissions(data[5])
      setDriveTypes(data[6])
      setConditions(data[7])
      setColors(data[8])
      setCities(data[9])
      setListingTypes(data[10])

      // =================================================
      // SET VEHICLE DATA
      // =================================================

      setFormData({
        categoryId: vehicle.categoryId ?? '',
        brandId: vehicle.brandId ?? '',
        modelId: vehicle.modelId ?? '',

        bodyTypeId: vehicle.bodyTypeId ?? '',
        fuelTypeId: vehicle.fuelTypeId ?? '',
        transmissionId:
          vehicle.transmissionId ?? '',
        driveTypeId:
          vehicle.driveTypeId ?? '',
        conditionId:
          vehicle.conditionId ?? '',
        colorId: vehicle.colorId ?? '',
        cityId: vehicle.cityId ?? '',
        listingTypeId:
          vehicle.listingTypeId ?? '',

        price: vehicle.price ?? '',
        year: vehicle.year ?? '',
        mileage: vehicle.mileage ?? '',

        engine: vehicle.engine ?? '',
        engineCC: vehicle.engineCC ?? '',

        powerHP: vehicle.powerHP ?? '',
        powerKW: vehicle.powerKW ?? '',

        cylinders: vehicle.cylinders ?? '',
        doors: vehicle.doors ?? '',
        seats: vehicle.seats ?? '',

        vin: vehicle.vin ?? '',
      })

      // =================================================
      // GET VEHICLE IMAGES
      // =================================================

      const imagesResponse = await fetch(
        `${API_BASE}/VehicleImage/vehicle/${id}`
      )

      const imagesText =
        await imagesResponse.text()

      console.log(
        'GET IMAGES STATUS:',
        imagesResponse.status
      )

      console.log(
        'GET IMAGES RESPONSE:',
        imagesText
      )

      if (!imagesResponse.ok) {
        throw new Error(
          'Fotot e veturës nuk u morën.'
        )
      }

      const imagesData =
        JSON.parse(imagesText)

      setImages(imagesData)
    } catch (err) {
      console.error(
        'EDIT VEHICLE LOAD ERROR:',
        err
      )

      setError(
        err.message ||
          'Nuk u morën të dhënat.'
      )
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // HANDLE CHANGE
  // =====================================================

  function handleChange(e) {
    const { name, value } = e.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))

    setError('')
    setSuccess('')
  }

  // =====================================================
  // BRAND CHANGE
  // =====================================================

  function handleBrandChange(e) {
    const brandId = e.target.value

    setFormData((previous) => ({
      ...previous,
      brandId,
      modelId: '',
    }))

    setError('')
    setSuccess('')
  }

  // =====================================================
  // FILTER MODELS
  // =====================================================

  const filteredModels = formData.brandId
    ? models.filter(
        (model) =>
          Number(model.brandId) ===
          Number(formData.brandId)
      )
    : []

  // =====================================================
  // SELECTED COLOR
  // =====================================================

  const selectedColor = colors.find(
    (color) =>
      Number(color.id) ===
      Number(formData.colorId)
  )

  // =====================================================
  // NUMBER
  // =====================================================

  function getNumberOrNull(value) {
    if (
      value === '' ||
      value === null ||
      value === undefined
    ) {
      return null
    }

    return Number(value)
  }

  // =====================================================
  // IMAGE FILE CHANGE
  // =====================================================

  async function handleFileChange(e) {
    const file = e.target.files?.[0]

    if (!file) {
      setSelectedFile(null)
      return
    }

    if (images.length >= 10) {
      setError('Maksimumi është 10 foto.')
      setSelectedFile(null)
      e.target.value = ''
      return
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      setError('Lejohen vetëm JPG, JPEG, PNG dhe WEBP.')
      setSelectedFile(null)
      return
    }

    try {
      setSelectedFile(await compressImageFile(file))
      setError('')
      setSuccess('')
    } catch (err) {
      setError(err.message || 'Fotoja nuk mund të jetë më e madhe se 5 MB.')
      setSelectedFile(null)
    }
  }

  // =====================================================
  // UPLOAD IMAGE
  // =====================================================

  async function handleUploadImage() {
    if (!selectedFile) {
      setError('Zgjidh një foto.')
      return
    }

    if (images.length >= 10) {
      setError('Maksimumi është 10 foto.')
      return
    }

    const token = await getClerkToken()

    if (!token) {
      setError('Nuk jeni të kyçur.')
      return
    }

    try {
      setUploadingImage(true)
      setError('')
      setSuccess('')

      const formDataImage = new FormData()

      formDataImage.append(
        'file',
        selectedFile
      )

      const uploadUrl =
        `${API_BASE}/VehicleImage/vehicle/${id}/upload`

      console.log(
        'UPLOAD VEHICLE IMAGE:',
        uploadUrl
      )

      const response = await fetch(
        uploadUrl,
        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          body: formDataImage,
        }
      )

      const responseText =
        await response.text()

      console.log(
        'UPLOAD IMAGE STATUS:',
        response.status
      )

      console.log(
        'UPLOAD IMAGE RESPONSE:',
        responseText
      )

      if (!response.ok) {
        let message =
          `Fotoja nuk u uploadua. Status: ${response.status}`

        try {
          const errorData =
            JSON.parse(responseText)

          if (errorData.message) {
            message =
              errorData.message
          }
        } catch {
          if (responseText) {
            message =
              responseText
          }
        }

        throw new Error(message)
      }

      const newImage =
        JSON.parse(responseText)

      // -------------------------------------------------
      // ADD IMAGE TO STATE
      // -------------------------------------------------

      setImages((previous) => [
        ...previous,
        {
          id: newImage.imageId,
          vehicleId:
            newImage.vehicleId,
          imageUrl:
            newImage.imageUrl,
          isPrimary:
            newImage.isPrimary,
          sortOrder:
            newImage.sortOrder,
        },
      ])

      // -------------------------------------------------
      // RESET FILE
      // -------------------------------------------------

      setSelectedFile(null)

      const input =
        document.getElementById(
          'vehicle-image-input'
        )

      if (input) {
        input.value = ''
      }

      setSuccess(
        'Fotoja u uploadua me sukses.'
      )
    } catch (err) {
      console.error(
        'UPLOAD IMAGE ERROR:',
        err
      )

      setError(
        err.message ||
          'Ndodhi një gabim gjatë upload-it të fotos.'
      )
    } finally {
      setUploadingImage(false)
    }
  }

  // =====================================================
  // SET PRIMARY IMAGE
  // =====================================================

  async function handleSetPrimary(imageId) {
    const token = await getClerkToken()

    if (!token) {
      setError('Nuk jeni të kyçur.')
      return
    }

    try {
      setError('')
      setSuccess('')

      const response = await fetch(
        `${API_BASE}/VehicleImage/${imageId}/primary`,
        {
          method: 'PUT',

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      )

      const responseText =
        await response.text()

      console.log(
        'SET PRIMARY STATUS:',
        response.status
      )

      console.log(
        'SET PRIMARY RESPONSE:',
        responseText
      )

      if (!response.ok) {
        let message =
          `Fotoja nuk u vendos si primary. Status: ${response.status}`

        try {
          const errorData =
            JSON.parse(responseText)

          if (errorData.message) {
            message =
              errorData.message
          }
        } catch {
          if (responseText) {
            message =
              responseText
          }
        }

        throw new Error(message)
      }

      // -------------------------------------------------
      // UPDATE STATE
      // -------------------------------------------------

      setImages((previous) =>
        previous.map((image) => ({
          ...image,

          isPrimary:
            image.id === imageId,
        }))
      )

      setSuccess(
        'Fotoja kryesore u ndryshua.'
      )
    } catch (err) {
      console.error(
        'PRIMARY IMAGE ERROR:',
        err
      )

      setError(
        err.message ||
          'Ndodhi një gabim gjatë ndryshimit të fotos primary.'
      )
    }
  }

  // =====================================================
  // DELETE IMAGE
  // =====================================================

  async function handleDeleteImage(imageId) {
    const token = await getClerkToken()

    if (!token) {
      setError('Nuk jeni të kyçur.')
      return
    }

    const confirmed =
      window.confirm(
        'A jeni i sigurt që dëshironi ta fshini këtë foto?'
      )

    if (!confirmed) {
      return
    }

    try {
      setError('')
      setSuccess('')

      const response = await fetch(
        `${API_BASE}/VehicleImage/${imageId}`,
        {
          method: 'DELETE',

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      )

      const responseText =
        await response.text()

      console.log(
        'DELETE IMAGE STATUS:',
        response.status
      )

      console.log(
        'DELETE IMAGE RESPONSE:',
        responseText
      )

      if (!response.ok) {
        let message =
          `Fotoja nuk u fshi. Status: ${response.status}`

        try {
          const errorData =
            JSON.parse(responseText)

          if (errorData.message) {
            message =
              errorData.message
          }
        } catch {
          if (responseText) {
            message =
              responseText
          }
        }

        throw new Error(message)
      }

      // -------------------------------------------------
      // REMOVE FROM STATE
      // -------------------------------------------------

      setImages((previous) =>
        previous.filter(
          (image) =>
            image.id !== imageId
        )
      )

      setSuccess(
        'Fotoja u fshi me sukses.'
      )
    } catch (err) {
      console.error(
        'DELETE IMAGE ERROR:',
        err
      )

      setError(
        err.message ||
          'Ndodhi një gabim gjatë fshirjes së fotos.'
      )
    }
  }

  // =====================================================
  // SUBMIT VEHICLE
  // =====================================================

  async function handleSubmit(e) {
    e.preventDefault()

    setError('')
    setSuccess('')

    const token = await getClerkToken()

    if (!token) {
      setError('Nuk jeni të kyçur.')
      return
    }

    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (!formData.categoryId) {
      setError('Zgjidh Category.')
      return
    }

    if (!formData.brandId) {
      setError('Zgjidh Brand.')
      return
    }

    if (!formData.modelId) {
      setError('Zgjidh Model.')
      return
    }

    if (!formData.listingTypeId) {
      setError('Zgjidh Listing Type.')
      return
    }

    if (!formData.price) {
      setError(
        'Price është i detyrueshëm.'
      )
      return
    }

    if (!formData.year) {
      setError(
        'Year është i detyrueshëm.'
      )
      return
    }

    try {
      setSaving(true)

      // -------------------------------------------------
      // BODY
      // -------------------------------------------------

      const vehicleData = {
        categoryId:
          Number(formData.categoryId),

        brandId:
          Number(formData.brandId),

        modelId:
          Number(formData.modelId),

        bodyTypeId:
          getNumberOrNull(
            formData.bodyTypeId
          ),

        fuelTypeId:
          getNumberOrNull(
            formData.fuelTypeId
          ),

        transmissionId:
          getNumberOrNull(
            formData.transmissionId
          ),

        driveTypeId:
          getNumberOrNull(
            formData.driveTypeId
          ),

        conditionId:
          getNumberOrNull(
            formData.conditionId
          ),

        colorId:
          getNumberOrNull(
            formData.colorId
          ),

        cityId:
          getNumberOrNull(
            formData.cityId
          ),

        listingTypeId:
          Number(formData.listingTypeId),

        price:
          Number(formData.price),

        year:
          Number(formData.year),

        mileage:
          getNumberOrNull(
            formData.mileage
          ),

        engine:
          formData.engine.trim() ||
          null,

        engineCC:
          getNumberOrNull(
            formData.engineCC
          ),

        powerHP:
          getNumberOrNull(
            formData.powerHP
          ),

        powerKW:
          getNumberOrNull(
            formData.powerKW
          ),

        cylinders:
          getNumberOrNull(
            formData.cylinders
          ),

        doors:
          getNumberOrNull(
            formData.doors
          ),

        seats:
          getNumberOrNull(
            formData.seats
          ),

        vin:
          formData.vin.trim() ||
          null,
      }

      console.log(
        '================================'
      )

      console.log(
        'UPDATE VEHICLE'
      )

      console.log(
        'URL:',
        `${API_BASE}/Vehicles/${id}`
      )

      console.log(
        'METHOD: PUT'
      )

      console.log(
        'BODY:',
        vehicleData
      )

      console.log(
        '================================'
      )

      // -------------------------------------------------
      // PUT
      // -------------------------------------------------

      const response = await fetch(
        `${API_BASE}/Vehicles/${id}`,
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body:
            JSON.stringify(
              vehicleData
            ),
        }
      )

      const responseText =
        await response.text()

      console.log(
        'UPDATE STATUS:',
        response.status
      )

      console.log(
        'UPDATE RESPONSE:',
        responseText
      )

      if (!response.ok) {
        let message =
          `Vehicle nuk u ndryshua. Status: ${response.status}`

        try {
          const errorData =
            JSON.parse(responseText)

          if (errorData.message) {
            message =
              errorData.message
          }
        } catch {
          if (responseText) {
            message =
              responseText
          }
        }

        throw new Error(message)
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      setSuccess(
        'Vehicle u ndryshua me sukses!'
      )

      setTimeout(() => {
        navigate('/my-vehicles')
      }, 1000)
    } catch (err) {
      console.error(
        'UPDATE VEHICLE ERROR:',
        err
      )

      setError(
        err.message ||
          'Ndodhi një gabim gjatë ndryshimit të veturës.'
      )
    } finally {
      setSaving(false)
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="edit-vehicle-page">
        <h1>Edit Vehicle</h1>

        <p>
          Duke ngarkuar të dhënat...
        </p>
      </div>
    )
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="edit-vehicle-page">

      <h1>Edit Vehicle</h1>

      <p>
        Ndrysho të dhënat e veturës.
      </p>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          style={{
            padding: '12px',
            marginBottom: '20px',
            border: '1px solid red',
            color: 'red',
            borderRadius: '5px',
          }}
        >
          {error}
        </div>
      )}

      {/* =================================================
          SUCCESS
      ================================================= */}

      {success && (
        <div
          style={{
            padding: '12px',
            marginBottom: '20px',
            border: '1px solid green',
            color: 'green',
            borderRadius: '5px',
          }}
        >
          {success}
        </div>
      )}

      {/* =================================================
          VEHICLE IMAGES
      ================================================= */}

      <div
        style={{
          marginBottom: '30px',
          padding: '20px',
          border: '1px solid #ccc',
          borderRadius: '8px',
        }}
      >

        <h2>
          Vehicle Images
        </h2>

        {/* =================================================
            EXISTING IMAGES
        ================================================= */}

        {images.length > 0 ? (

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '15px',
              marginBottom: '25px',
            }}
          >

            {images.map((image) => (

              <div
                key={image.id}
                style={{
                  width: '220px',
                  padding: '10px',

                  border:
                    image.isPrimary
                      ? '3px solid green'
                      : '1px solid #ccc',

                  borderRadius: '6px',
                }}
              >

                <img
                  src={mediaUrl(image.imageUrl)}
                  alt="Vehicle"
                  style={{
                    width: '100%',
                    height: '140px',
                    objectFit: 'cover',
                    display: 'block',
                    marginBottom: '10px',
                    borderRadius: '4px',
                  }}
                />

                {image.isPrimary && (
                  <p
                    style={{
                      color: 'green',
                      fontWeight: 'bold',
                      margin: '5px 0',
                    }}
                  >
                    ⭐ Primary Image
                  </p>
                )}

                {!image.isPrimary && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSetPrimary(
                        image.id
                      )
                    }
                    disabled={
                      uploadingImage ||
                      saving
                    }
                  >
                    Set Primary
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteImage(
                      image.id
                    )
                  }
                  disabled={
                    uploadingImage ||
                    saving
                  }
                  style={{
                    marginLeft: '8px',
                  }}
                >
                  Delete
                </button>

              </div>

            ))}

          </div>

        ) : (

          <p>
            Kjo veturë nuk ka ende foto.
          </p>

        )}

        {/* =================================================
            ADD NEW IMAGE
        ================================================= */}

        <div>

          <h3>
            Add New Image
          </h3>

          <input
            id="vehicle-image-input"
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleFileChange}
            disabled={
              uploadingImage ||
              saving ||
              images.length >= 10
            }
          />

          <button
            type="button"
            onClick={handleUploadImage}
            disabled={
              !selectedFile ||
              uploadingImage ||
              saving ||
              images.length >= 10
            }
            style={{
              marginLeft: '10px',
            }}
          >
            {uploadingImage
              ? 'Uploading...'
              : 'Upload Image'}
          </button>

          {selectedFile && (
            <p>
              Selected:{' '}
              {selectedFile.name}
            </p>
          )}

          <small>
            Max 5 MB. JPG, JPEG, PNG, WEBP. Deri në 10 foto.
          </small>

        </div>

      </div>

      {/* =================================================
          VEHICLE FORM
      ================================================= */}

      <form onSubmit={handleSubmit}>

        {/* =================================================
            CATEGORY
        ================================================= */}

        <div>
          <label>
            Category
          </label>

          <br />

          <select
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
          >
            <option value="">
              Select Category
            </option>

            {categories.map(
              (category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              )
            )}

          </select>
        </div>

        <br />

        {/* =================================================
            BRAND
        ================================================= */}

        <div>
          <label>
            Brand
          </label>

          <br />

          <select
            name="brandId"
            value={formData.brandId}
            onChange={handleBrandChange}
          >
            <option value="">
              Select Brand
            </option>

            {brands.map(
              (brand) => (
                <option
                  key={brand.id}
                  value={brand.id}
                >
                  {brand.name}
                </option>
              )
            )}

          </select>
        </div>

        <br />

        {/* =================================================
            MODEL
        ================================================= */}

        <div>
          <label>
            Model
          </label>

          <br />

          <select
            name="modelId"
            value={formData.modelId}
            onChange={handleChange}
            disabled={
              !formData.brandId
            }
          >
            <option value="">
              Select Model
            </option>

            {filteredModels.map(
              (model) => (
                <option
                  key={model.id}
                  value={model.id}
                >
                  {model.name}
                </option>
              )
            )}

          </select>
        </div>

        <br />

        {/* =================================================
            LISTING TYPE
        ================================================= */}

        <div>
          <label>
            Listing Type
          </label>

          <br />

          <select
            name="listingTypeId"
            value={
              formData.listingTypeId
            }
            onChange={handleChange}
          >
            <option value="">
              Select Listing Type
            </option>

            {listingTypes.map(
              (listingType) => (
                <option
                  key={listingType.id}
                  value={listingType.id}
                >
                  {listingType.name}
                </option>
              )
            )}

          </select>
        </div>

        <br />

        {/* =================================================
            BODY TYPE
        ================================================= */}

        <div>
          <label>
            Body Type
          </label>

          <br />

          <select
            name="bodyTypeId"
            value={
              formData.bodyTypeId
            }
            onChange={handleChange}
          >
            <option value="">
              Select Body Type
            </option>

            {bodyTypes.map(
              (bodyType) => (
                <option
                  key={bodyType.id}
                  value={bodyType.id}
                >
                  {bodyType.name}
                </option>
              )
            )}

          </select>
        </div>

        <br />

        {/* =================================================
            FUEL TYPE
        ================================================= */}

        <div>
          <label>
            Fuel Type
          </label>

          <br />

          <select
            name="fuelTypeId"
            value={
              formData.fuelTypeId
            }
            onChange={handleChange}
          >
            <option value="">
              Select Fuel Type
            </option>

            {fuelTypes.map(
              (fuel) => (
                <option
                  key={fuel.id}
                  value={fuel.id}
                >
                  {fuel.name}
                </option>
              )
            )}

          </select>
        </div>

        <br />

        {/* =================================================
            TRANSMISSION
        ================================================= */}

        <div>
          <label>
            Transmission
          </label>

          <br />

          <select
            name="transmissionId"
            value={
              formData.transmissionId
            }
            onChange={handleChange}
          >
            <option value="">
              Select Transmission
            </option>

            {transmissions.map(
              (transmission) => (
                <option
                  key={transmission.id}
                  value={
                    transmission.id
                  }
                >
                  {transmission.name}
                </option>
              )
            )}

          </select>
        </div>

        <br />

        {/* =================================================
            DRIVE TYPE
        ================================================= */}

        <div>
          <label>
            Drive Type
          </label>

          <br />

          <select
            name="driveTypeId"
            value={
              formData.driveTypeId
            }
            onChange={handleChange}
          >
            <option value="">
              Select Drive Type
            </option>

            {driveTypes.map(
              (drive) => (
                <option
                  key={drive.id}
                  value={drive.id}
                >
                  {drive.name}
                </option>
              )
            )}

          </select>
        </div>

        <br />

        {/* =================================================
            CONDITION
        ================================================= */}

        <div>
          <label>
            Condition
          </label>

          <br />

          <select
            name="conditionId"
            value={
              formData.conditionId
            }
            onChange={handleChange}
          >
            <option value="">
              Select Condition
            </option>

            {conditions.map(
              (condition) => (
                <option
                  key={condition.id}
                  value={condition.id}
                >
                  {condition.name}
                </option>
              )
            )}

          </select>
        </div>

        <br />

        {/* =================================================
            COLOR
        ================================================= */}

        <div>
          <label>
            Color
          </label>

          <br />

          <select
            name="colorId"
            value={
              formData.colorId
            }
            onChange={handleChange}
          >
            <option value="">
              Select Color
            </option>

            {colors.map(
              (color) => (
                <option
                  key={color.id}
                  value={color.id}
                >
                  {color.name}
                </option>
              )
            )}

          </select>

          {selectedColor?.hexCode && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '8px',
              }}
            >

              <div
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor:
                    selectedColor.hexCode,
                  border:
                    '1px solid #000',
                  borderRadius: '4px',
                }}
              />

              <span>
                {selectedColor.hexCode}
              </span>

            </div>
          )}

        </div>

        <br />

        {/* =================================================
            CITY
        ================================================= */}

        <div>
          <label>
            City
          </label>

          <br />

          <select
            name="cityId"
            value={
              formData.cityId
            }
            onChange={handleChange}
          >
            <option value="">
              Select City
            </option>

            {cities.map(
              (city) => (
                <option
                  key={city.id}
                  value={city.id}
                >
                  {city.name}

                  {city.countryName
                    ? ` - ${city.countryName}`
                    : ''}
                </option>
              )
            )}

          </select>
        </div>

        <hr />

        {/* =================================================
            PRICE
        ================================================= */}

        <div>
          <label>
            Price
          </label>

          <br />

          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            min="0"
            step="0.01"
          />
        </div>

        <br />

        {/* =================================================
            YEAR
        ================================================= */}

        <div>
          <label>
            Year
          </label>

          <br />

          <input
            type="number"
            name="year"
            value={formData.year}
            onChange={handleChange}
            min="1900"
            max="2100"
          />
        </div>

        <br />

        {/* =================================================
            MILEAGE
        ================================================= */}

        <div>
          <label>
            Mileage
          </label>

          <br />

          <input
            type="number"
            name="mileage"
            value={formData.mileage}
            onChange={handleChange}
            min="0"
          />
        </div>

        <br />

        {/* =================================================
            ENGINE
        ================================================= */}

        <div>
          <label>
            Engine
          </label>

          <br />

          <input
            type="text"
            name="engine"
            value={formData.engine}
            onChange={handleChange}
          />
        </div>

        <br />

        {/* =================================================
            ENGINE CC
        ================================================= */}

        <div>
          <label>
            Engine CC
          </label>

          <br />

          <input
            type="number"
            name="engineCC"
            value={formData.engineCC}
            onChange={handleChange}
            min="0"
          />
        </div>

        <br />

        {/* =================================================
            POWER HP
        ================================================= */}

        <div>
          <label>
            Power HP
          </label>

          <br />

          <input
            type="number"
            name="powerHP"
            value={formData.powerHP}
            onChange={handleChange}
            min="0"
          />
        </div>

        <br />

        {/* =================================================
            POWER KW
        ================================================= */}

        <div>
          <label>
            Power KW
          </label>

          <br />

          <input
            type="number"
            name="powerKW"
            value={formData.powerKW}
            onChange={handleChange}
            min="0"
          />
        </div>

        <br />

        {/* =================================================
            CYLINDERS
        ================================================= */}

        <div>
          <label>
            Cylinders
          </label>

          <br />

          <input
            type="number"
            name="cylinders"
            value={
              formData.cylinders
            }
            onChange={handleChange}
            min="0"
          />
        </div>

        <br />

        {/* =================================================
            DOORS
        ================================================= */}

        <div>
          <label>
            Doors
          </label>

          <br />

          <input
            type="number"
            name="doors"
            value={formData.doors}
            onChange={handleChange}
            min="0"
          />
        </div>

        <br />

        {/* =================================================
            SEATS
        ================================================= */}

        <div>
          <label>
            Seats
          </label>

          <br />

          <input
            type="number"
            name="seats"
            value={formData.seats}
            onChange={handleChange}
            min="0"
          />
        </div>

        <br />

        {/* =================================================
            VIN
        ================================================= */}

        <div>
          <label htmlFor="vin">
            VIN (optional)
          </label>

          <br />

          <input
            id="vin"
            type="text"
            name="vin"
            value={formData.vin}
            onChange={handleChange}
            autoComplete="off"
          />
          <p>
            Only add a VIN if you want it stored with this listing.
          </p>
        </div>

        <hr />

        {/* =================================================
            BUTTONS
        ================================================= */}

        <button
          type="submit"
          disabled={
            saving ||
            uploadingImage
          }
        >
          {saving
            ? 'Duke ruajtur...'
            : 'Save Changes'}
        </button>

        <button
          type="button"
          onClick={() =>
            navigate('/my-vehicles')
          }
          disabled={
            saving ||
            uploadingImage
          }
          style={{
            marginLeft: '10px',
          }}
        >
          Cancel
        </button>

      </form>

    </div>
  )
}