import React from 'react';
import { Mail, Smartphone, ShieldCheck } from 'lucide-react';

/**
 * Future OTP contact-method scaffold.
 * It is intentionally presentation-only until Supabase email/SMS OTP providers,
 * phone uniqueness policy, and verification handlers are configured.
 */
export default function AuthContactMethod({ value, onChange, contact, onContactChange, code, onCodeChange }) {
  return (
    <section className="auth-contact-scaffold" aria-label="روش دریافت کد تأیید">
      <div className="auth-contact-heading">
        <ShieldCheck size={17} />
        <span>روش دریافت کد تأیید</span>
      </div>
      <p>برای حساب خود فقط یکی از روش‌های زیر را انتخاب کن.</p>
      <div className="auth-contact-methods" role="group" aria-label="انتخاب روش تأیید">
        <button type="button" className={value === 'email' ? 'active' : ''} onClick={() => onChange('email')}>
          <Mail size={16} /> ایمیل
        </button>
        <button type="button" className={value === 'phone' ? 'active' : ''} onClick={() => onChange('phone')}>
          <Smartphone size={16} /> شماره تلفن
        </button>
      </div>
      <label>
        {value === 'phone' ? 'شماره تلفن همراه' : 'آدرس ایمیل'}
        <input
          type={value === 'phone' ? 'tel' : 'email'}
          value={contact}
          onChange={event => onContactChange(event.target.value)}
          placeholder={value === 'phone' ? '+98 912 000 0000' : 'name@example.com'}
          autoComplete={value === 'phone' ? 'tel' : 'email'}
          inputMode={value === 'phone' ? 'tel' : 'email'}
        />
      </label>
      <label>
        کد یک‌بارمصرف
        <input
          type="text"
          value={code}
          onChange={event => onCodeChange(event.target.value.replace(/\\D/g, '').slice(0, 8))}
          placeholder="کد ارسال‌شده را وارد کن"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          disabled
        />
      </label>
      <small className="auth-contact-note">
        ارسال و بررسی کد تا زمان اتصال سرویس پیامک/ایمیل و فعال‌سازی کنترل یکتایی شماره در سرور غیرفعال است.
      </small>
    </section>
  );
}
