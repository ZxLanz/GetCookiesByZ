import React, { useState } from 'react';
import { Eye, EyeOff, Cookie, User, Lock, Sparkles, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e) => {
    // CRITICAL: Prevent form default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🔵 [1] handleSubmit started');
    
    // Validation
    if (!email.trim() || !password.trim()) {
      console.log('🟡 [2] Validation failed');
      toast.error('Email dan password harus diisi!');
      return;
    }

    console.log('🔵 [2] Validation passed, starting login...');
    setLoading(true);
    
    try {
      console.log('🔵 [3] Calling authService.login...');
      const response = await authService.login(email, password, rememberMe);
      
      console.log('✅ [4] Login SUCCESS:', response);
      toast.success('Login berhasil! Selamat datang 🎉');
      
      console.log('🔵 [5] Waiting 1 second before redirect...');
      // Delay before calling parent callback to show toast
      setTimeout(() => {
        console.log('🔵 [6] Calling onLogin callback...');
        if (onLogin) {
          onLogin();
        }
        console.log('🔵 [7] onLogin callback completed');
      }, 1000); // 1 second delay
      
    } catch (error) {
      console.error('❌ [ERROR] Login failed:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Login gagal';
      toast.error(errorMessage);
      setLoading(false); // Only set loading false on error
    }
    
    console.log('🔵 [END] handleSubmit function ended');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit(e);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #01868f 0%, #018790 50%, #01a4af 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      {/* Animated Background Blobs */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        zIndex: 0
      }}>
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '-5%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'float1 8s ease-in-out infinite'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: 'float2 10s ease-in-out infinite'
        }}></div>
      </div>

      {/* Main Card */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '1000px',
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: window.innerWidth > 768 ? '1fr 1fr' : '1fr',
        minHeight: '600px'
      }}>
        {/* LEFT SIDE - Form */}
        <div style={{
          padding: '60px 50px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          {/* Logo/Brand */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #018790 0%, #01a4af 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(1, 135, 144, 0.3)'
              }}>
                <Cookie size={24} color="white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#1f2937',
                  margin: 0,
                  lineHeight: 1
                }}>
                  Get Cookies Z
                </h1>
                <p style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  margin: 0,
                  fontWeight: 500,
                  letterSpacing: '0.5px'
                }}>
                  BY SAINT ZILAN
                </p>
              </div>
            </div>
          </div>

          {/* Welcome Text */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '8px'
            }}>
              Welcome Back
            </h2>
            <p style={{
              fontSize: '15px',
              color: '#6b7280'
            }}>
              Sign in to continue to your dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Email Input */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '8px'
              }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: '#9ca3af'
                }} />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 48px',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb',
                    background: '#f9fafb',
                    color: '#111827',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#018790';
                    e.target.style.background = 'white';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.background = '#f9fafb';
                  }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '8px'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: '#9ca3af'
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px 48px 14px 48px',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb',
                    background: '#f9fafb',
                    color: '#111827',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#018790';
                    e.target.style.background = 'white';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.background = '#f9fafb';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    color: '#9ca3af',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#018790'
                  }}
                />
                Remember me
              </label>
              <a href="#" style={{
                fontSize: '14px',
                color: '#018790',
                textDecoration: 'none',
                fontWeight: 600
              }}>
                Forgot Password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #018790 0%, #01a4af 100%)',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(1, 135, 144, 0.3)',
                transition: 'all 0.3s ease',
                opacity: loading ? 0.7 : 1,
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(1, 135, 144, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(1, 135, 144, 0.3)';
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span style={{ fontSize: '18px' }}>→</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT SIDE - Illustration */}
        <div style={{
          background: 'linear-gradient(135deg, #018790 0%, #01a4af 100%)',
          padding: '60px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative Background Elements */}
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(40px)',
            animation: 'pulse 4s ease-in-out infinite'
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '20%',
            right: '10%',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(50px)',
            animation: 'pulse 5s ease-in-out infinite'
          }}></div>

          {/* Main Cookie Container */}
          <div style={{
            position: 'relative',
            width: '300px',
            height: '300px',
            marginBottom: '40px'
          }}>
            {/* Floating Decorative Stars */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              animation: 'float3 3s ease-in-out infinite'
            }}>
              <Star size={20} color="#fbbf24" fill="#fbbf24" style={{
                filter: 'drop-shadow(0 2px 8px rgba(251, 191, 36, 0.6))'
              }} />
            </div>
            <div style={{
              position: 'absolute',
              top: '60px',
              right: '30px',
              animation: 'float4 3.5s ease-in-out infinite'
            }}>
              <Sparkles size={24} color="rgba(255, 255, 255, 0.9)" fill="rgba(255, 255, 255, 0.6)" style={{
                filter: 'drop-shadow(0 2px 8px rgba(255, 255, 255, 0.4))'
              }} />
            </div>
            <div style={{
              position: 'absolute',
              bottom: '40px',
              left: '40px',
              animation: 'float5 4s ease-in-out infinite'
            }}>
              <Star size={16} color="#fbbf24" fill="#fbbf24" style={{
                filter: 'drop-shadow(0 2px 8px rgba(251, 191, 36, 0.6))'
              }} />
            </div>

            {/* Rotating Cookie - Center */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '180px',
              height: '180px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              borderRadius: '50%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), inset 0 0 40px rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'rotate 20s linear infinite',
              border: '3px solid rgba(255, 255, 255, 0.2)'
            }}>
              <Cookie style={{
                width: '90px',
                height: '90px',
                color: 'white',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))'
              }} strokeWidth={2} />
            </div>

            {/* Orbiting Mini Cookie */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '200px',
              height: '200px',
              marginLeft: '-100px',
              marginTop: '-100px',
              animation: 'rotateReverse 10s linear infinite'
            }}>
              <div style={{
                position: 'absolute',
                top: '0',
                left: '50%',
                marginLeft: '-12px',
                width: '24px',
                height: '24px',
                background: 'white',
                borderRadius: '50%',
                boxShadow: '0 4px 12px rgba(255, 255, 255, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Cookie size={14} color="#018790" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div style={{
            textAlign: 'center',
            animation: 'fadeInUp 1s ease-out'
          }}>
            <h3 style={{
              color: 'white',
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '12px',
              textShadow: '0 2px 12px rgba(0,0,0,0.2)'
            }}>
              Get Your Cookies
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '16px',
              lineHeight: '1.6',
              textShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}>
              Automatically manage your Kasir Pintar
              <br />
              cookies with ease and efficiency
            </p>
          </div>

          {/* Small Decorative Cookies */}
          <div style={{
            position: 'absolute',
            bottom: '60px',
            right: '40px',
            display: 'flex',
            gap: '12px',
            animation: 'float6 4s ease-in-out infinite'
          }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{
                width: '32px',
                height: '32px',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(5px)',
                border: '2px solid rgba(255, 255, 255, 0.2)'
              }}>
                <Cookie size={16} color="white" strokeWidth={2} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, -20px); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 20px); }
        }
        @keyframes float3 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(10deg); }
        }
        @keyframes float4 {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-12px) scale(1.1); }
        }
        @keyframes float5 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float6 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes rotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes rotateReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        input::placeholder {
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;