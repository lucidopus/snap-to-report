export const getLocation = (): Promise<{ lat: number; lon: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10_000 }
      );
    });