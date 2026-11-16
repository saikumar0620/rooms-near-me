import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const STORAGE_KEY = 'ROOMIE_POST_ROOM_DRAFT';

export default function PostRoomForm({ onRoomCreated }) {
  // S5: Restore data & step from localStorage
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved
      ? JSON.parse(saved).data
      : {
          title: '',
          room_type: 'private',
          furnished: 'no',
          area: '',
          lat: '17.4401',
          lng: '78.3489',
          rent: '',
          deposit: '',
          available_from: new Date().toISOString().split('T')[0],
        };
  });

  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).step : 1;
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);

  // S5: Save draft on any change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data: formData }));
  }, [step, formData]);

  const validateStep = (currentStep) => {
    const errs = {};
    if (currentStep === 1) {
      if (!formData.title || formData.title.trim().length < 5 || formData.title.trim().length > 80) {
        errs.title = 'Title must be 5 to 80 characters';
      }
      if (!['private', 'shared', 'studio'].includes(formData.room_type)) {
        errs.room_type = 'Select a valid room type';
      }
      if (!['yes', 'no'].includes(formData.furnished)) {
        errs.furnished = 'Select furnished status';
      }
    } else if (currentStep === 2) {
      if (!formData.area.trim()) errs.area = 'Area is required';
      const lat = Number(formData.lat);
      if (isNaN(lat) || lat < 6.0 || lat > 37.0) errs.lat = 'Latitude must be between 6.0 and 37.0 (India)';
      const lng = Number(formData.lng);
      if (isNaN(lng) || lng < 68.0 || lng > 98.0) errs.lng = 'Longitude must be between 68.0 and 98.0 (India)';
    } else if (currentStep === 3) {
      const rent = Number(formData.rent);
      if (isNaN(rent) || !Number.isInteger(rent) || rent < 1000 || rent > 200000) {
        errs.rent = 'Rent must be whole rupees between 1,000 and 200,000';
      }
      const dep = Number(formData.deposit);
      if (isNaN(dep) || !Number.isInteger(dep) || dep < 0) {
        errs.deposit = 'Deposit must be a valid whole rupee amount';
      } else if (!isNaN(rent) && dep > 6 * rent) {
        errs.deposit = 'Deposit cannot exceed 6 times the monthly rent';
      }
      const today = new Date().toISOString().split('T')[0];
      if (!formData.available_from || formData.available_from < today) {
        errs.available_from = 'Date must be today or later';
      }
    }
    return errs;
  };

  const handleNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  };

  // F2: Back preserves all typed data
  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateStep(3);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      // F3: Redirect to the first step containing a server error
      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
          if (data.errors.title || data.errors.room_type || data.errors.furnished) setStep(1);
          else if (data.errors.area || data.errors.lat || data.errors.lng) setStep(2);
          else setStep(3);
        } else {
          setServerError(data.error || 'Submission failed');
        }
        return;
      }

      // S5: Clear draft on success
      localStorage.removeItem(STORAGE_KEY);
      alert(`Room posted successfully! ID: ${data.room.room_id}`);
      onRoomCreated();
    } catch (err) {
      setServerError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e2e8f0' }}>
      {/* F2: Progress Indicator */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
          <span>Step {step} of 3</span>
          <span style={{ color: '#64748b' }}>
            {step === 1 ? 'Room Details' : step === 2 ? 'Location' : 'Rent & Terms'}
          </span>
        </div>
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3 }}>
          <div style={{ height: '100%', background: '#2563eb', borderRadius: 3, width: `${(step / 3) * 100}%`, transition: 'width 0.25s' }} />
        </div>
      </div>

      {serverError && <div style={{ padding: 10, background: '#fee2e2', color: '#b91c1c', borderRadius: 6, marginBottom: 14 }}>{serverError}</div>}

      <form onSubmit={handleSubmit}>
        {/* Step 1: Room */}
        {step === 1 && (
          <fieldset style={{ border: 'none', padding: 0 }}>
            <legend style={{ fontWeight: 700, marginBottom: 16 }}>1. Room Details</legend>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="f-title" style={labelStyle}>Title (5-80 chars) *</label>
              <input id="f-title" name="title" value={formData.title} onChange={handleChange} aria-describedby={errors.title ? 'err-title' : undefined} style={inputStyle} />
              {errors.title && <span id="err-title" role="alert" style={errorStyle}>{errors.title}</span>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="f-type" style={labelStyle}>Room Type *</label>
              <select id="f-type" name="room_type" value={formData.room_type} onChange={handleChange} style={inputStyle}>
                <option value="private">Private</option>
                <option value="shared">Shared</option>
                <option value="studio">Studio</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="f-furnished" style={labelStyle}>Furnished *</label>
              <select id="f-furnished" name="furnished" value={formData.furnished} onChange={handleChange} style={inputStyle}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </fieldset>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <fieldset style={{ border: 'none', padding: 0 }}>
            <legend style={{ fontWeight: 700, marginBottom: 16 }}>2. Location</legend>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="f-area" style={labelStyle}>Area / Locality *</label>
              <input id="f-area" name="area" value={formData.area} onChange={handleChange} aria-describedby={errors.area ? 'err-area' : undefined} style={inputStyle} />
              {errors.area && <span id="err-area" role="alert" style={errorStyle}>{errors.area}</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label htmlFor="f-lat" style={labelStyle}>Latitude (6-37) *</label>
                <input id="f-lat" name="lat" value={formData.lat} onChange={handleChange} aria-describedby={errors.lat ? 'err-lat' : undefined} style={inputStyle} />
                {errors.lat && <span id="err-lat" role="alert" style={errorStyle}>{errors.lat}</span>}
              </div>
              <div>
                <label htmlFor="f-lng" style={labelStyle}>Longitude (68-98) *</label>
                <input id="f-lng" name="lng" value={formData.lng} onChange={handleChange} aria-describedby={errors.lng ? 'err-lng' : undefined} style={inputStyle} />
                {errors.lng && <span id="err-lng" role="alert" style={errorStyle}>{errors.lng}</span>}
              </div>
            </div>
          </fieldset>
        )}

        {/* Step 3: Rent */}
        {step === 3 && (
          <fieldset style={{ border: 'none', padding: 0 }}>
            <legend style={{ fontWeight: 700, marginBottom: 16 }}>3. Rent & Deposit</legend>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="f-rent" style={labelStyle}>Monthly Rent (₹1,000 - ₹200,000) *</label>
              <input id="f-rent" type="number" name="rent" value={formData.rent} onChange={handleChange} aria-describedby={errors.rent ? 'err-rent' : undefined} style={inputStyle} />
              {errors.rent && <span id="err-rent" role="alert" style={errorStyle}>{errors.rent}</span>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="f-deposit" style={labelStyle}>Deposit (Max 6x rent) *</label>
              <input id="f-deposit" type="number" name="deposit" value={formData.deposit} onChange={handleChange} aria-describedby={errors.deposit ? 'err-deposit' : undefined} style={inputStyle} />
              {errors.deposit && <span id="err-deposit" role="alert" style={errorStyle}>{errors.deposit}</span>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="f-date" style={labelStyle}>Available From *</label>
              <input id="f-date" type="date" name="available_from" value={formData.available_from} onChange={handleChange} aria-describedby={errors.available_from ? 'err-date' : undefined} style={inputStyle} />
              {errors.available_from && <span id="err-date" role="alert" style={errorStyle}>{errors.available_from}</span>}
            </div>
          </fieldset>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          {step > 1 && (
            <button type="button" onClick={handleBack} style={{ padding: '8px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
              Back
            </button>
          )}
          <div style={{ marginLeft: 'auto' }}>
            {step < 3 ? (
              <button type="button" onClick={handleNext} style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                Next
              </button>
            ) : (
              <button type="submit" style={{ padding: '8px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                Submit Room
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '9px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5, color: '#334155' };
const errorStyle = { color: '#dc2626', fontSize: 12, marginTop: 4, display: 'block' };
