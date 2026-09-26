import "./AddVehicle.css";
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getClerkToken } from '../services/clerkToken'
import { mediaUrl } from '../utils/mediaUrl'
import { API_BASE } from '../config/api'
import { compressImageFile } from '../utils/compressImage'
import { useLanguage } from '../i18n/LanguageContext'

export const EditVehicle = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()

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
  const [cityQuery, setCityQuery] = useState('')
  const [cityOpen, setCityOpen] = useState(false)
  const [brandQuery, setBrandQuery] = useState('')
  const [brandOpen, setBrandOpen] = useState(false)
  const [modelQuery, setModelQuery] = useState('')
  const [modelOpen, setModelOpen] = useState(false)

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

  useEffect(() => {
    if (formData.modelId) {
      const model = models.find(
        (item) => Number(item.id) === Number(formData.modelId)
      )
      if (model) setModelQuery(model.name)
    }
    if (formData.brandId) {
      const brand = brands.find(
        (item) => Number(item.id) === Number(formData.brandId)
      )
      if (brand) setBrandQuery(brand.name)
    }
    if (formData.cityId) {
      const city = cities.find(
        (item) => Number(item.id) === Number(formData.cityId)
      )
      if (city) {
        setCityQuery(
          city.countryName ? `${city.name} - ${city.countryName}` : city.name
        )
      }
    }
  }, [models, brands, cities, formData.modelId, formData.brandId, formData.cityId])

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

  function handleBrandQueryChange(e) {
    const value = e.target.value
    setBrandQuery(value)
    setBrandOpen(true)
    setFormData((previous) => {
      const current = brands.find(
        (brand) => Number(brand.id) === Number(previous.brandId)
      )
      if (current && current.name === value) return previous
      return { ...previous, brandId: '', modelId: '' }
    })
    setModelQuery('')
    setModelOpen(false)
    setError('')
    setSuccess('')
  }

  function pickBrand(brand) {
    setFormData((previous) => ({
      ...previous,
      brandId: String(brand.id),
      modelId: '',
    }))
    setBrandQuery(brand.name)
    setBrandOpen(false)
    setModelQuery('')
    setModelOpen(false)
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

  function normalizePlace(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '')
  }

  function cityLabel(city) {
    if (!city) return ''
    return city.countryName ? `${city.name} - ${city.countryName}` : city.name
  }

  const brandSuggestions = (() => {
    const needle = normalizePlace(brandQuery)
    if (needle.length < 1) return []
    return brands
      .filter((brand) => normalizePlace(brand.name).includes(needle))
      .slice(0, 15)
  })()

  const citySuggestions = (() => {
    const needle = normalizePlace(cityQuery)
    if (needle.length < 1) return []
    return cities
      .filter((city) =>
        normalizePlace(`${city.name} ${city.countryName || ''}`).includes(
          needle
        )
      )
      .slice(0, 15)
  })()

  function handleCityQueryChange(e) {
    const value = e.target.value
    setCityQuery(value)
    setCityOpen(true)
    setFormData((previous) => {
      const current = cities.find(
        (city) => Number(city.id) === Number(previous.cityId)
      )
      if (current && cityLabel(current) === value) return previous
      return { ...previous, cityId: '' }
    })
    setError('')
  }

  function pickCity(city) {
    setFormData((previous) => ({ ...previous, cityId: String(city.id) }))
    setCityQuery(cityLabel(city))
    setCityOpen(false)
    setError('')
  }

  const modelSuggestions = (() => {
    if (!formData.brandId) return []
    const needle = normalizePlace(modelQuery)
    if (needle.length < 1) return []
    return filteredModels
      .filter((model) => normalizePlace(model.name).includes(needle))
      .slice(0, 15)
  })()

  function handleModelQueryChange(e) {
    const value = e.target.value
    setModelQuery(value)
    setModelOpen(true)
    setFormData((previous) => {
      const current = models.find(
        (model) => Number(model.id) === Number(previous.modelId)
      )
      if (current && current.name === value) return previous
      return { ...previous, modelId: '' }
    })
    setError('')
  }

  function pickModel(model) {
    setFormData((previous) => ({
      ...previous,
      modelId: String(model.id),
    }))
    setModelQuery(model.name)
    setModelOpen(false)
    setError('')
  }

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
    const selectedFiles = Array.from(e.target.files || [])
    e.target.value = ''

    if (!selectedFiles.length) return

    const room = 10 - images.length
    if (room <= 0) {
      setError('Maksimumi është 10 foto.')
      return
    }

    const token = await getClerkToken()
    if (!token) {
      setError('Nuk jeni të kyçur.')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const files = selectedFiles.slice(0, room)
    setUploadingImage(true)
    setError('')
    setSuccess('')

    try {
      for (const file of files) {
        if (!allowedTypes.includes(file.type)) {
          setError('Lejohen vetëm JPG, JPEG, PNG dhe WEBP.')
          continue
        }
        const compressed = await compressImageFile(file)
        const formDataImage = new FormData()
        formDataImage.append('file', compressed)
        const response = await fetch(
          `${API_BASE}/VehicleImage/vehicle/${id}/upload`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formDataImage,
          }
        )
        const responseText = await response.text()
        if (!response.ok) {
          let message = `Fotoja nuk u uploadua. Status: ${response.status}`
          try {
            const errorData = JSON.parse(responseText)
            if (errorData.message) message = errorData.message
          } catch {
            if (responseText) message = responseText
          }
          throw new Error(message)
        }
        const newImage = JSON.parse(responseText)
        setImages((previous) => [
          ...previous,
          {
            id: newImage.imageId,
            vehicleId: newImage.vehicleId,
            imageUrl: newImage.imageUrl,
            isPrimary: newImage.isPrimary,
            sortOrder: newImage.sortOrder,
          },
        ])
      }
      setSuccess('Fotoja u uploadua me sukses.')
    } catch (err) {
      setError(
        err.message ||
          'Ndodhi një gabim gjatë upload-it të fotos.'
      )
    } finally {
      setUploadingImage(false)
      setSelectedFile(null)
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


  if (loading) {
    return (
      <div className="add-vehicle-page">
        <div className="add-vehicle-loading">
          <div className="loading-spinner" />
          <p>{t("loading")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="add-vehicle-page">
      <div className="add-vehicle-heading">
        <div>
          <span className="form-eyebrow">AUTOTRADE</span>
          <h1>{t("editTitle")}</h1>
          <p>{t("editSubtitle")}</p>
        </div>
      </div>

      {error && (
        <div className="form-message form-error" role="alert">
          <span>!</span>
          {error}
        </div>
      )}

      {success && (
        <div className="form-message form-success">
          <span>✓</span>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <section className="vehicle-photos-section">
          <div className="vehicle-photos-compact-head">
            <h2>{t("photos")}</h2>
            <p>{t("photosHint")}</p>
          </div>

          <label className={`photo-add-circle-wrap${images.length < 2 ? " photo-add-needed" : ""}`}>
            <input
              id="vehicle-image-input"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              disabled={saving || uploadingImage || images.length >= 10}
            />
            <span className="photo-add-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="photo-add-count">
              {images.length}/10
            </span>
          </label>

          <div className="vehicle-photo-strip">
            {images.map((image) => (
              <div
                className={`vehicle-photo-thumb ${image.isPrimary ? "main-photo" : ""}`}
                key={image.id}
              >
                <img src={mediaUrl(image.imageUrl)} alt="" />
                {image.isPrimary ? (
                  <span className="main-photo-label">Main</span>
                ) : (
                  <button
                    type="button"
                    className="vehicle-photo-make-main"
                    onClick={() => handleSetPrimary(image.id)}
                    disabled={uploadingImage || saving}
                  >
                    Main
                  </button>
                )}
                <button
                  type="button"
                  className="vehicle-photo-remove"
                  aria-label="Remove photo"
                  onClick={() => handleDeleteImage(image.id)}
                  disabled={uploadingImage || saving}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="form-section-title">
          <span>01</span>
          <div>
            <h2>{t("listing")}</h2>
            <p>{t("listingHint")}</p>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="listingTypeId">{t("listingType")}</label>
            <select
              id="listingTypeId"
              name="listingTypeId"
              value={formData.listingTypeId}
              onChange={handleChange}
            >
              <option value="">{t("selectSaleRent")}</option>
              {listingTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="categoryId">{t("category")}</label>
            <select
              id="categoryId"
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
            >
              <option value="">{t("selectCategory")}</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field city-autocomplete">
            <label htmlFor="citySearch">{t("city")}</label>
            <input
              id="citySearch"
              type="text"
              autoComplete="off"
              placeholder={t("typeCity")}
              value={cityQuery}
              onChange={handleCityQueryChange}
              onFocus={() => setCityOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setCityOpen(false), 160)
              }}
              disabled={saving}
            />
            {cityOpen && citySuggestions.length > 0 ? (
              <ul className="city-suggest-list" role="listbox">
                {citySuggestions.map((city) => (
                  <li key={city.id}>
                    <button
                      type="button"
                      className="city-suggest-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pickCity(city)}
                    >
                      {city.name}
                      {city.countryName ? ` - ${city.countryName}` : ''}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="form-section-title">
          <span>02</span>
          <div>
            <h2>{t("vehicle")}</h2>
            <p>{t("vehicleHint")}</p>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-field city-autocomplete">
            <label htmlFor="brandSearch">{t("brand")}</label>
            <input
              id="brandSearch"
              type="text"
              autoComplete="off"
              placeholder={t("typeBrand")}
              value={brandQuery}
              onChange={handleBrandQueryChange}
              onFocus={() => setBrandOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setBrandOpen(false), 160)
              }}
              disabled={saving}
            />
            {brandOpen && brandSuggestions.length > 0 ? (
              <ul className="city-suggest-list" role="listbox">
                {brandSuggestions.map((brand) => (
                  <li key={brand.id}>
                    <button
                      type="button"
                      className="city-suggest-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pickBrand(brand)}
                    >
                      {brand.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="form-field city-autocomplete">
            <label htmlFor="modelSearch">{t("model")}</label>
            <input
              id="modelSearch"
              type="text"
              autoComplete="off"
              placeholder={formData.brandId ? t("typeModel") : t("firstBrand")}
              value={modelQuery}
              onChange={handleModelQueryChange}
              onFocus={() => formData.brandId && setModelOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setModelOpen(false), 160)
              }}
              disabled={!formData.brandId || saving}
            />
            {modelOpen && modelSuggestions.length > 0 ? (
              <ul className="city-suggest-list" role="listbox">
                {modelSuggestions.map((model) => (
                  <li key={model.id}>
                    <button
                      type="button"
                      className="city-suggest-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pickModel(model)}
                    >
                      {model.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="form-field">
            <label htmlFor="bodyTypeId">{t("bodyType")}</label>
            <select
              id="bodyTypeId"
              name="bodyTypeId"
              value={formData.bodyTypeId}
              onChange={handleChange}
            >
              <option value="">{t("selectBody")}</option>
              {bodyTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="colorId">{t("color")}</label>
            <select
              id="colorId"
              name="colorId"
              value={formData.colorId}
              onChange={handleChange}
            >
              <option value="">{t("selectColor")}</option>
              {colors.map((color) => (
                <option key={color.id} value={color.id}>
                  {color.name}
                </option>
              ))}
            </select>
            {selectedColor?.hexCode && (
              <div className="color-preview">
                <span style={{ backgroundColor: selectedColor.hexCode }} />
                {selectedColor.name}
              </div>
            )}
          </div>
        </div>

        <div className="form-section-title">
          <span>03</span>
          <div>
            <h2>{t("specs")}</h2>
            <p>{t("specsHint")}</p>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="fuelTypeId">{t("fuel")}</label>
            <select
              id="fuelTypeId"
              name="fuelTypeId"
              value={formData.fuelTypeId}
              onChange={handleChange}
            >
              <option value="">{t("selectFuel")}</option>
              {fuelTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="transmissionId">{t("transmission")}</label>
            <select
              id="transmissionId"
              name="transmissionId"
              value={formData.transmissionId}
              onChange={handleChange}
            >
              <option value="">{t("selectTrans")}</option>
              {transmissions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="driveTypeId">{t("driveType")}</label>
            <select
              id="driveTypeId"
              name="driveTypeId"
              value={formData.driveTypeId}
              onChange={handleChange}
            >
              <option value="">{t("selectDrive")}</option>
              {driveTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="engine">{t("engine")}</label>
            <input
              id="engine"
              type="text"
              name="engine"
              value={formData.engine}
              onChange={handleChange}
              placeholder="e.g. 2.0 Diesel"
            />
          </div>

          <div className="form-field">
            <label htmlFor="engineCC">Engine CC</label>
            <input
              id="engineCC"
              type="number"
              name="engineCC"
              value={formData.engineCC}
              onChange={handleChange}
              placeholder="e.g. 1995"
              min="0"
            />
          </div>

          <div className="form-field">
            <label htmlFor="cylinders">Cylinders</label>
            <input
              id="cylinders"
              type="number"
              name="cylinders"
              value={formData.cylinders}
              onChange={handleChange}
              placeholder="e.g. 4"
              min="0"
            />
          </div>

          <div className="form-field">
            <label htmlFor="powerHP">Power HP</label>
            <input
              id="powerHP"
              type="number"
              name="powerHP"
              value={formData.powerHP}
              onChange={handleChange}
              placeholder="e.g. 190"
              min="0"
            />
          </div>

          <div className="form-field">
            <label htmlFor="powerKW">Power KW</label>
            <input
              id="powerKW"
              type="number"
              name="powerKW"
              value={formData.powerKW}
              onChange={handleChange}
              placeholder="e.g. 140"
              min="0"
            />
          </div>

          <div className="form-field">
            <label htmlFor="seats">Seats (optional)</label>
            <input
              id="seats"
              type="number"
              name="seats"
              value={formData.seats}
              onChange={handleChange}
              placeholder="e.g. 5"
              min="1"
            />
          </div>

          <div className="form-field">
            <label htmlFor="doors">Doors</label>
            <input
              id="doors"
              type="number"
              name="doors"
              value={formData.doors}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-field">
            <label htmlFor="conditionId">Condition</label>
            <select
              id="conditionId"
              name="conditionId"
              value={formData.conditionId}
              onChange={handleChange}
            >
              <option value="">Select Condition</option>
              {conditions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field form-field-wide">
            <label htmlFor="vin">VIN (optional)</label>
            <input
              id="vin"
              type="text"
              name="vin"
              value={formData.vin}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="form-section-title">
          <span>04</span>
          <div>
            <h2>{t("priceDetails")}</h2>
            <p>{t("priceHint")}</p>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="year">{t("year")}</label>
            <input
              id="year"
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              placeholder="e.g. 2020"
              min="1900"
              max="2100"
            />
          </div>

          <div className="form-field">
            <label htmlFor="mileage">{t("mileage")}</label>
            <div className="input-with-unit">
              <input
                id="mileage"
                type="number"
                name="mileage"
                value={formData.mileage}
                onChange={handleChange}
                placeholder="e.g. 120000"
                min="0"
              />
              <span>km</span>
            </div>
          </div>

          <div className="form-field price-field">
            <label htmlFor="price">{t("price")}</label>
            <div className="input-with-unit">
              <input
                id="price"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g. 25000"
                min="0"
              />
              <span>€</span>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate('/my-vehicles')}
            disabled={saving || uploadingImage}
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={saving || uploadingImage}
          >
            {saving || uploadingImage ? t("saving") : t("saveChanges")}
          </button>
        </div>
      </form>
    </div>
  )
}
