import { useEffect, useState } from 'react';
import { paramsApi } from '../services/api';

export default function Home() {
  const [appLogo, setAppLogo] = useState('');

  useEffect(() => {
    paramsApi.list().then((res: any) => {
      const params = res.data.data || [];
      const logo = params.find((p: any) => p.param_key === 'app.logo');
      if (logo?.param_value) setAppLogo(logo.param_value);
    }).catch(() => {});
  }, []);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {appLogo ? (
        <img
          src={appLogo}
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
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
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
