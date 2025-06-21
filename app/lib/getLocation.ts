export const getLocation = (): Promise<{ lat: number; lon: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error("Geolocation not supported"));
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lon } = pos.coords;
          resolve({ lat, lon });
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10_000 }
      );
    });