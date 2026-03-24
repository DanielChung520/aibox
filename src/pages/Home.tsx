import { useContentTokens, useEffectiveTheme } from '../contexts/AppThemeProvider';
import logoLight from '../assets/logo-light.png';
import logoDark from '../assets/logo.png';

export default function Home() {
  const contentTokens = useContentTokens();
  const effectiveTheme = useEffectiveTheme();
  const logoSrc = effectiveTheme === 'dark' ? logoDark : logoLight;

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {logoSrc ? (
        <img
          src={logoSrc}
          alt="logo"
          style={{
            width: 400,
            height: 400,
            objectFit: 'contain',
          }}
        />
      ) : (
        <div style={{
          width: 400,
          height: 400,
          background: `linear-gradient(135deg, ${contentTokens.colorPrimary} 0%, ${contentTokens.colorInfo} 100%)`,
          borderRadius: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 128,
          color: '#fff',
          fontWeight: 'bold',
        }}>
          ABC
        </div>
      )}
    </div>
  );
}
