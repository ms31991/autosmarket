import "./Payment.css";
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { API_BASE } from '../../config/api'

export const Payment = () => {
  const { purchaseId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const { token, isLoggedIn } = useAuth()

  // =====================================================
  // PURCHASE
  // =====================================================

  const [purchase, setPurchase] = useState(null)

  // =====================================================
  // PAYMENT
  // =====================================================

  const [paymentMethod, setPaymentMethod] = useState(1)
  const [payment, setPayment] = useState(null)

  // =====================================================
  // STATE
  // =====================================================

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [verifyingStripe, setVerifyingStripe] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // =====================================================
  // CHECK LOGIN + PURCHASE ID
  // =====================================================

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }

    if (!purchaseId) {
      setError('Purchase ID mungon.')
      setLoading(false)
      return
    }

    const canceled =
      searchParams.get('canceled') === 'true'

    if (canceled) {
      setError('Pagesa u anulua.')
    }

    fetchPurchase()
  }, [isLoggedIn, purchaseId])

  useEffect(() => {
    if (!isLoggedIn || !token || !purchaseId) {
      return
    }

    const sessionId =
      searchParams.get('session_id')

    const isSuccessReturn =
      searchParams.get('success') === 'true'

    if (!sessionId || !isSuccessReturn) {
      return
    }

    verifyStripeReturn(sessionId)
  }, [isLoggedIn, token, purchaseId, searchParams])

  // =====================================================
  // GET PURCHASE
  // =====================================================

  async function fetchPurchase() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `${API_BASE}/PurchaseAdvertisement/${purchaseId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const text = await response.text()

      let data = {}

      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        data = {}
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.title ||
            'Purchase nuk u gjet.'
        )
      }

      setPurchase(data)
    } catch (err) {
      console.error('GET PURCHASE ERROR:', err)

      setError(
        err.message ||
          'Nuk mund të merrej purchase.'
      )
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // CREATE PAYMENT
  // =====================================================

  async function createPayment() {
    const response = await fetch(
      `${API_BASE}/Payments`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          purchaseAdvertisementId: Number(purchaseId),
          method: Number(paymentMethod),
        }),
      }
    )

    const text = await response.text()

    let data = {}

    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = {}
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.title ||
          'Payment nuk u krijua.'
      )
    }

    return data
  }

  // =====================================================
  // CREATE STRIPE CHECKOUT SESSION
  // =====================================================

  async function createStripeCheckoutSession(paymentId) {
    const response = await fetch(
      `${API_BASE}/Payments/create-checkout-session`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          purchaseAdvertisementId: Number(purchaseId),
          paymentId: Number(paymentId),
        }),
      }
    )

    const text = await response.text()

    let data = {}

    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = {}
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.title ||
          'Stripe checkout nuk u krijua.'
      )
    }

    return data
  }

  // =====================================================
  // VERIFY STRIPE RETURN
  // =====================================================

  async function verifyStripeReturn(sessionId) {
    try {
      setVerifyingStripe(true)
      setError('')

      const storedPaymentId =
        sessionStorage.getItem(
          `stripePaymentId_${purchaseId}`
        )

      let paymentId = storedPaymentId

      if (!paymentId) {
        const myPaymentsResponse = await fetch(
          `${API_BASE}/Payments/my`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        const myPaymentsText =
          await myPaymentsResponse.text()

        let myPayments = []

        try {
          myPayments = myPaymentsText
            ? JSON.parse(myPaymentsText)
            : []
        } catch {
          myPayments = []
        }

        const matchedPayment = Array.isArray(myPayments)
          ? myPayments.find(
              (item) =>
                Number(item.purchaseAdvertisementId) ===
                Number(purchaseId)
            )
          : null

        paymentId = matchedPayment?.id
      }

      if (!paymentId) {
        throw new Error(
          'Payment ID nuk u gjet pas pagesës Stripe.'
        )
      }

      const response = await fetch(
        `${API_BASE}/Payments/${paymentId}/verify-stripe`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            sessionId,
          }),
        }
      )

      const text = await response.text()

      let data = {}

      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        data = {}
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.title ||
            'Pagesa Stripe nuk u verifikua.'
        )
      }

      setPayment(data)
      setSuccess(true)
    } catch (err) {
      console.error('VERIFY STRIPE ERROR:', err)

      setError(
        err.message ||
          'Pagesa Stripe nuk u verifikua.'
      )
    } finally {
      setVerifyingStripe(false)
    }
  }

  // =====================================================
  // CONFIRM PAYMENT
  // =====================================================

  async function confirmPayment(paymentId) {
    const response = await fetch(
      `${API_BASE}/Payments/${paymentId}/confirm`,
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const text = await response.text()

    let data = {}

    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = {}
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.title ||
          'Pagesa nuk u konfirmua.'
      )
    }

    return data
  }

  // =====================================================
  // HANDLE PAYMENT
  // =====================================================

  async function handlePayment(event) {
    event.preventDefault()

    setError('')
    setSuccess(false)

    if (!token) {
      setError('Duhet të jesh i kyçur.')
      navigate('/login')
      return
    }

    if (!purchaseId) {
      setError('Purchase ID mungon.')
      return
    }

    if (!purchase) {
      setError('Purchase nuk është gati.')
      return
    }

    try {
      setProcessing(true)

      // =================================================
      // STEP 1 - CREATE PAYMENT
      // =================================================

      const createdPayment = await createPayment()
      setPayment(createdPayment)

      const checkout = await createStripeCheckoutSession(createdPayment.id)
      if (checkout?.url) {
        window.location.assign(checkout.url)
        return
      }

      throw new Error("Stripe checkout nuk u krijua.")
    } catch (err) {
      console.error(
        'PAYMENT ERROR:',
        err
      )

      setError(
        err.message ||
          'Pagesa dështoi.'
      )
    } finally {
      setProcessing(false)
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div
        style={{
          maxWidth: '800px',
          margin: '40px auto',
          padding: '20px',
        }}
      >
        <h1>Payment</h1>

        <p>
          Duke ngarkuar purchase...
        </p>
      </div>
    )
  }

  // =====================================================
  // ERROR WITHOUT PURCHASE
  // =====================================================

  if (error && !purchase) {
    return (
      <div
        style={{
          maxWidth: '700px',
          margin: '40px auto',
          padding: '30px',
        }}
      >
        <h1>Payment</h1>

        <div
          style={{
            padding: '15px',
            border: '1px solid #ffb3b3',
            borderRadius: '8px',
            backgroundColor: '#fff5f5',
            color: '#c00000',
            marginBottom: '20px',
          }}
        >
          {error}
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: '#111',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Go Back
        </button>
      </div>
    )
  }

  // =====================================================
  // SUCCESS
  // =====================================================

  if (success) {
    return (
      <div
        style={{
          maxWidth: '650px',
          margin: '50px auto',
          padding: '35px',
          textAlign: 'center',
          border: '1px solid #ddd',
          borderRadius: '14px',
          backgroundColor: '#fff',
          boxShadow:
            '0 4px 14px rgba(0,0,0,0.08)',
        }}
      >
        <h1>
          Payment Successful
        </h1>

        <p>
          Pagesa u përfundua me sukses.
        </p>

        <p>
          Purchase ID:{' '}
          <strong>
            {purchaseId}
          </strong>
        </p>

        {payment && (
          <>
            <p>
              Payment ID:{' '}
              <strong>
                {payment.id}
              </strong>
            </p>

            <p>
              Amount:{' '}
              <strong>
                {Number(
                  payment.amount || 0
                ).toLocaleString()}{' '}
                {payment.currency || 'EUR'}
              </strong>
            </p>

            <p>
              Status:{' '}
              <strong>
                {payment.status}
              </strong>
            </p>
          </>
        )}

        <button
          type="button"
          onClick={() =>
            navigate('/')
          }
          style={{
            marginTop: '20px',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: '#111',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '600',
          }}
        >
          Go to Home
        </button>
      </div>
    )
  }

  // =====================================================
  // PAYMENT PAGE
  // =====================================================

  return (
    <div className="payment-page">
      {/* HEADER */}

      <div
        style={{
          marginBottom: '30px',
        }}
      >
        <h1>Payment</h1>

        <p
          style={{
            color: '#666',
          }}
        >
          Përfundo pagesën për paketën
          e reklamimit.
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div
          style={{
            padding: '15px',
            marginBottom: '25px',
            border: '1px solid #ffb3b3',
            borderRadius: '8px',
            backgroundColor: '#fff5f5',
            color: '#c00000',
          }}
        >
          {error}
        </div>
      )}

      {/* PURCHASE INFORMATION */}

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '25px',
          backgroundColor: '#fff',
          boxShadow:
            '0 4px 14px rgba(0,0,0,0.06)',
        }}
      >
        <h2
          style={{
            marginTop: 0,
          }}
        >
          Purchase Details
        </h2>

        <p>
          <strong>
            Purchase ID:
          </strong>{' '}
          {purchase?.id}
        </p>

        {purchase?.advertisementPackageId != null && (
          <p>
            <strong>
              Package ID:
            </strong>{' '}
            {purchase.advertisementPackageId}
          </p>
        )}

        {purchase?.advertisementId != null && (
          <p>
            <strong>
              Advertisement ID:
            </strong>{' '}
            {purchase.advertisementId}
          </p>
        )}

        {purchase?.amount != null && (
          <p>
            <strong>
              Amount:
            </strong>{' '}
            {Number(
              purchase.amount
            ).toLocaleString()}{' '}
            {purchase.currency || 'EUR'}
          </p>
        )}

        {purchase?.price != null && (
          <p>
            <strong>
              Price:
            </strong>{' '}
            {Number(
              purchase.price
            ).toLocaleString()}{' '}
            {purchase.currency || 'EUR'}
          </p>
        )}

        {purchase?.status != null && (
          <p>
            <strong>
              Purchase Status:
            </strong>{' '}
            {purchase.status}
          </p>
        )}
      </div>

      {/* PAYMENT FORM */}

      <form
        onSubmit={handlePayment}
        style={{
          border: '1px solid #ddd',
          borderRadius: '12px',
          padding: '25px',
          backgroundColor: '#fff',
          boxShadow:
            '0 4px 14px rgba(0,0,0,0.06)',
        }}
      >
        <h2>
          Payment Method
        </h2>

        <p
          style={{
            color: '#777',
            fontSize: '14px',
            marginBottom: '25px',
          }}
        >
          Për momentin pagesa është
          simulator. Stripe/PayPal mund
          të lidhen më vonë.
        </p>

        {/* PAYMENT METHOD */}

        <div
          style={{
            marginBottom: '25px',
          }}
        >
          <label
            htmlFor="paymentMethod"
            style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '8px',
            }}
          >
            Payment Method
          </label>

          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(
                Number(event.target.value)
              )
            }
            disabled={processing}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '8px',
              boxSizing: 'border-box',
              fontSize: '15px',
            }}
          >
            <option value={1}>
              Card
            </option>

            <option value={2}>
              PayPal
            </option>
          </select>
        </div>

        {/* PAYMENT SUMMARY */}

        <div
          style={{
            padding: '18px',
            marginBottom: '25px',
            border: '1px solid #eee',
            borderRadius: '8px',
            backgroundColor: '#f8f8f8',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              Total
            </span>

            <strong
              style={{
                fontSize: '24px',
              }}
            >
              {Number(
                purchase?.amount ??
                  purchase?.price ??
                  0
              ).toLocaleString()}{' '}
              {purchase?.currency || 'EUR'}
            </strong>
          </div>
        </div>

        {/* BUTTONS */}

        <div
          style={{
            display: 'flex',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={processing}
            style={{
              flex: 1,
              padding: '14px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#f5f5f5',
              cursor: processing
                ? 'default'
                : 'pointer',
              fontSize: '15px',
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={processing}
            style={{
              flex: 2,
              padding: '14px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: processing
                ? '#777'
                : '#111',
              color: '#fff',
              cursor: processing
                ? 'default'
                : 'pointer',
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            {processing
              ? 'Processing...'
              : 'Confirm Payment'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Payment
