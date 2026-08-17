import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import StudentPortal from './StudentPortal';
import './styles.css';

function Main() {
  const [portal, setPortal] = React.useState(() => {
    const path = window.location.pathname;
    if (path === '/student' || path === '/student.html') return 'student';
    return 'admin';
  });

  React.useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/student' || path === '/student.html') {
        setPortal('student');
      } else {
        setPortal('admin');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (portal === 'student') {
    return <StudentPortal />;
  }
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);
