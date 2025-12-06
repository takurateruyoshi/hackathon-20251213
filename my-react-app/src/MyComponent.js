import React, { useState, useEffect } from 'react';
import axios from 'axios';

function MyComponent() {
  const [data, setData] = useState('');

  useEffect(() => {
    axios.get('http://localhost:8000/api/data')
      .then(response => {
        setData(response.data.message);
      })
      .catch(error => {
        console.error('There was an error!', error);
      });
  }, []);

  return (
    <div>
      <h1>Data from FastAPI:</h1>
      <p>{data}</p>
    </div>
  );
}

export default MyComponent;
