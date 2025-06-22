// app/page.tsx

"use client"; // This is important for client-side components in Next.js App Router

import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Import Leaflet CSS
import L from 'leaflet';

// Import the Supabase client
import { supabase } from '../lib/supabaseClient';

// Import CSS module
import styles from '@/styles/Home.module.css'

// --- Type Definitions ---
interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  address?: string; // Optional, based on your schema
  report?: string; // Optional
  timestamp?: string; // Optional, for date parsing
  image_url?: string; // Optional
  annotated_image_url?: string; // Optional
  mainid?: number; // Optional
}

// --- End Type Definitions ---

// Fix for default marker icon issue with Leaflet and Webpack/Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(L.Icon.Default.prototype as any)._getIconUrl = function () {
  return 'marker-icon.png';
};

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'marker-icon-2x.png',
  iconUrl: 'marker-icon.png',
  shadowUrl: 'marker-shadow.png',
});

export default function Home() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview'); // State for active tab

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('items') // Your table name
          .select('*');

        if (error) {
          throw error;
        }

        if (data) {
          setLocations(data as Location[]);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching locations:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // --- EDA Calculations ---
  const edaData = useMemo(() => {
    const totalLocations = locations.length;
    const uniqueCategories = new Set(locations.map(loc => loc.category)).size;

    let avgLatitude = 0;
    let avgLongitude = 0;
    if (totalLocations > 0) {
      avgLatitude = locations.reduce((sum, loc) => sum + loc.latitude, 0) / totalLocations;
      avgLongitude = locations.reduce((sum, loc) => sum + loc.longitude, 0) / totalLocations;
    }

    // Locations per Category
    const locationsPerCategory: { [key: string]: number } = {};
    locations.forEach(loc => {
      locationsPerCategory[loc.category] = (locationsPerCategory[loc.category] || 0) + 1;
    });

    // Convert to array of { category: string, count: number } for easier rendering
    const sortedCategories = Object.entries(locationsPerCategory)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    // Basic time-based analysis (e.g., locations added per month/year)
    const locationsByMonth: { [key: string]: number } = {};
    locations.forEach(loc => {
      if (loc.timestamp) {
        try {
          const dateObj = new Date(loc.timestamp);
          const monthYear = `${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getFullYear()}`;
          locationsByMonth[monthYear] = (locationsByMonth[monthYear] || 0) + 1;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          console.warn("Invalid timestamp encountered:", loc.timestamp);
        }
      }
    });

    const sortedMonths = Object.entries(locationsByMonth)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()); // Sort chronologically

    return {
      totalLocations,
      uniqueCategories,
      avgLatitude: avgLatitude.toFixed(4), // More precision for coordinates
      avgLongitude: avgLongitude.toFixed(4),
      sortedCategories,
      sortedMonths,
    };
  }, [locations]);

  // --- End EDA Calculations ---

  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}>Loading locations...</div>
    </div>
  );

  if (error) return (
    <div className={styles.errorContainer}>
      <div className={styles.errorMessage}>Error: {error}</div>
    </div>
  );

  const defaultCenter: [number, number] = locations.length > 0
    ? [locations[0].latitude, locations[0].longitude]
    : [0, 0];

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Supabase Locations Dashboard</h1>
      </header>

      <main className={styles.mainContent}>
        {/* Map Section */}
        <section className={styles.mapSection}>
          <div className={styles.mapContainer}>
            <MapContainer
              center={defaultCenter}
              zoom={locations.length > 0 ? 10 : 2}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {locations.map((location: Location) => (
                <Marker
                  key={location.id}
                  position={[location.latitude, location.longitude]}
                >
                  <Popup>
                    <div className={styles.popupContent}>
                      <strong>{location.name}</strong><br />
                      <span>Category: {location.category}</span><br />
                      <span>Address: {location.address || 'N/A'}</span><br />
                      <span>Report: {location.report || 'No report'}</span><br />
                      <span>Coordinates: {location.latitude}, {location.longitude}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </section>

        {/* EDA Section */}
        <aside className={styles.sidePanel}>
          <div className={styles.panelHeader}>
            <h2>Data Insights</h2>
          </div>

          <nav className={styles.tabNavigation}>
            <button
              className={`${styles.tabButton} ${activeTab === 'overview' ? styles.active : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'categories' ? styles.active : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              Categories
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'timeline' ? styles.active : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              Timeline
            </button>
          </nav>

          <div className={styles.tabContent}>
            {activeTab === 'overview' && (
              <div className={styles.overviewTab}>
                <div className={styles.statCard}>
                  <h4>Total Locations</h4>
                  <div className={styles.statNumber}>{edaData.totalLocations}</div>
                  <p>items found across all regions</p>
                </div>

                <div className={styles.statCard}>
                  <h4>Unique Categories</h4>
                  <div className={styles.statNumber}>{edaData.uniqueCategories}</div>
                  <p>distinct types of locations</p>
                </div>

                <div className={styles.statCard}>
                  <h4>Center Point</h4>
                  <div className={styles.coordinates}>
                    <span>Lat: {edaData.avgLatitude}</span>
                    <span>Lng: {edaData.avgLongitude}</span>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <h4>Data Quality</h4>
                  <div className={styles.dataQuality}>
                    <div className={styles.qualityItem}>
                      <span>Missing Address:</span>
                      <span>{locations.filter(loc => !loc.address).length}</span>
                    </div>
                    <div className={styles.qualityItem}>
                      <span>Missing Report:</span>
                      <span>{locations.filter(loc => !loc.report).length}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'categories' && (
              <div className={styles.categoriesTab}>
                <h4>Locations by Category</h4>
                <div className={styles.categoryList}>
                  {edaData.sortedCategories.length > 0 ? (
                    edaData.sortedCategories.map(({ category, count }) => (
                      <div key={category} className={styles.categoryItem}>
                        <span className={styles.categoryName}>
                          {category || 'Uncategorized'}
                        </span>
                        <span className={styles.categoryCount}>{count}</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyState}>No categories found</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className={styles.timelineTab}>
                <h4>Locations Added by Month/Year</h4>
                <div className={styles.timelineList}>
                  {edaData.sortedMonths.length > 0 ? (
                    edaData.sortedMonths.map(({ month, count }) => (
                      <div key={month} className={styles.timelineItem}>
                        <span className={styles.timelinePeriod}>{month}</span>
                        <span className={styles.timelineCount}>{count}</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyState}>No timestamp data available</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

// // app/page.tsx
// "use client"; // This is important for client-side components in Next.js App Router

// import { useState, useEffect, useMemo } from 'react';
// import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// import 'leaflet/dist/leaflet.css'; // Import Leaflet CSS
// import L from 'leaflet';

// // Import the Supabase client
// import { supabase } from '../lib/supabaseClient';

// // Import CSS module
// import styles from '@/styles/Home.module.css'

// // --- Type Definitions ---
// interface Location {
//   id: string;
//   name: string;
//   latitude: number;
//   longitude: number;
//   category: string;
//   address?: string; // Optional, based on your schema
//   report?: string; // Optional
//   timestamp?: string; // Optional, for date parsing
//   image_url?: string; // Optional
//   annotated_image_url?: string; // Optional
//   mainid?: number; // Optional
// }
// // --- End Type Definitions ---


// // Fix for default marker icon issue with Leaflet and Webpack/Next.js
// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// (L.Icon.Default.prototype as any)._getIconUrl = function () {
//     return 'marker-icon.png';
// };
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'marker-icon-2x.png',
//   iconUrl: 'marker-icon.png',
//   shadowUrl: 'marker-shadow.png',
// });


// export default function Home() {
//   const [locations, setLocations] = useState<Location[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);
//   const [activeTab, setActiveTab] = useState<string>('overview'); // State for active tab

//   useEffect(() => {
//     const fetchLocations = async () => {
//       try {
//         setLoading(true);
//         const { data, error } = await supabase
//           .from('items') // Your table name
//           .select('*');

//         if (error) {
//           throw error;
//         }

//         if (data) {
//           setLocations(data as Location[]);
//         }
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       } catch (err: any) {
//         setError(err.message);
//         console.error("Error fetching locations:", err.message);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchLocations();
//   }, []);

//   // --- EDA Calculations ---
//   const edaData = useMemo(() => {
//     const totalLocations = locations.length;
//     const uniqueCategories = new Set(locations.map(loc => loc.category)).size;

//     let avgLatitude = 0;
//     let avgLongitude = 0;
//     if (totalLocations > 0) {
//       avgLatitude = locations.reduce((sum, loc) => sum + loc.latitude, 0) / totalLocations;
//       avgLongitude = locations.reduce((sum, loc) => sum + loc.longitude, 0) / totalLocations;
//     }

//     // Locations per Category
//     const locationsPerCategory: { [key: string]: number } = {};
//     locations.forEach(loc => {
//       locationsPerCategory[loc.category] = (locationsPerCategory[loc.category] || 0) + 1;
//     });
//     // Convert to array of { category: string, count: number } for easier rendering
//     const sortedCategories = Object.entries(locationsPerCategory)
//         .map(([category, count]) => ({ category, count }))
//         .sort((a, b) => b.count - a.count); // Sort by count descending

//     // Basic time-based analysis (e.g., locations added per month/year)
//     const locationsByMonth: { [key: string]: number } = {};
//     locations.forEach(loc => {
//       if (loc.timestamp) {
//         try {
//           const dateObj = new Date(loc.timestamp);
//           const monthYear = `${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getFullYear()}`;
//           locationsByMonth[monthYear] = (locationsByMonth[monthYear] || 0) + 1;
//         // eslint-disable-next-line @typescript-eslint/no-unused-vars
//         } catch (e) {
//           console.warn("Invalid timestamp encountered:", loc.timestamp);
//         }
//       }
//     });
//     const sortedMonths = Object.entries(locationsByMonth)
//         .map(([month, count]) => ({ month, count }))
//         .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()); // Sort chronologically

//     return {
//       totalLocations,
//       uniqueCategories,
//       avgLatitude: avgLatitude.toFixed(4), // More precision for coordinates
//       avgLongitude: avgLongitude.toFixed(4),
//       sortedCategories,
//       sortedMonths,
//     };
//   }, [locations]);
//   // --- End EDA Calculations ---

//   if (loading) return <div className={styles.container} style={{ justifyContent: 'center' }}>Loading locations...</div>;
//   if (error) return <div className={styles.container} style={{ justifyContent: 'center', color: 'red' }}>Error: {error}</div>;

//   const defaultCenter: [number, number] = locations.length > 0
//     ? [locations[0].latitude, locations[0].longitude]
//     : [0, 0];

//   return (
//     <div className={styles.container}>
//       <h1 className={styles.title}>Supabase Locations Dashboard</h1>

//       <div className={styles.contentWrapper}>
//         {/* Map Section */}
//         <div className={styles.mapContainer}>
//           <MapContainer
//             center={defaultCenter}
//             zoom={locations.length > 0 ? 10 : 2}
//             style={{ height: '100%', width: '100%' }}
//             scrollWheelZoom={true}
//           >
//             <TileLayer
//               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//             />
//             {locations.map((location: Location) => (
//               <Marker
//                 key={location.id}
//                 position={[location.latitude, location.longitude]}
//               >
//                 <Popup>
//                   <strong>{location.name}</strong><br />
//                   Category: {location.category}<br />
//                   Address: {location.address || 'N/A'}<br />
//                   Report: {location.report || 'No report'}<br />
//                   Lat: {location.latitude}, Lng: {location.longitude}
//                 </Popup>
//               </Marker>
//             ))}
//           </MapContainer>
//         </div>

//         {/* EDA Section */}
//         <div className={styles.edaSection}>
//           <h2 className={styles.edaHeader}>Data Insights</h2>

//           <div className={styles.tabButtons}>
//             <button
//               className={`${styles.tabButton} ${activeTab === 'overview' ? styles.active : ''}`}
//               onClick={() => setActiveTab('overview')}
//             >
//               Overview
//             </button>
//             <button
//               className={`${styles.tabButton} ${activeTab === 'categories' ? styles.active : ''}`}
//               onClick={() => setActiveTab('categories')}
//             >
//               Categories
//             </button>
//             <button
//               className={`${styles.tabButton} ${activeTab === 'timeline' ? styles.active : ''}`}
//               onClick={() => setActiveTab('timeline')}
//             >
//               Timeline
//             </button>
//           </div>

//           <div className={styles.edaContent}>
//             {activeTab === 'overview' && (
//               <>
//                 <div className={styles.edaBox}>
//                   <h4>Total Locations</h4>
//                   <p><strong>{edaData.totalLocations}</strong> items found across all regions.</p>
//                 </div>
//                 <div className={styles.edaBox}>
//                   <h4>Unique Categories</h4>
//                   <p>Your data covers <strong>{edaData.uniqueCategories}</strong> distinct types of locations.</p>
//                 </div>
//                 <div className={styles.edaBox}>
//                   <h4>Average Coordinates</h4>
//                   <p>Center Point (Lat, Lng):<br />
//                      <strong>({edaData.avgLatitude}, {edaData.avgLongitude})</strong></p>
//                 </div>
//                  <div className={styles.edaBox}>
//                   <h4>Missing Data Check</h4>
//                   <p>Locations without Address: <strong>{locations.filter(loc => !loc.address).length}</strong></p>
//                   <p>Locations without Report: <strong>{locations.filter(loc => !loc.report).length}</strong></p>
//                 </div>
//               </>
//             )}

//             {activeTab === 'categories' && (
//               <div className={`${styles.edaBox} ${styles.categoryList}`}>
//                 <h4>Locations by Category</h4>
//                 <ul>
//                   {edaData.sortedCategories.length > 0 ? (
//                     edaData.sortedCategories.map(({ category, count }) => (
//                       <li key={category}>
//                         <span>{category || 'Uncategorized'}</span>
//                         <span className={styles.categoryCount}>{count}</span>
//                       </li>
//                     ))
//                   ) : (
//                     <li>No categories found.</li>
//                   )}
//                 </ul>
//               </div>
//             )}

//             {activeTab === 'timeline' && (
//               <div className={`${styles.edaBox} ${styles.categoryList}`}> {/* Reusing categoryList styles for list layout */}
//                 <h4>Locations Added by Month/Year</h4>
//                 <ul>
//                   {edaData.sortedMonths.length > 0 ? (
//                     edaData.sortedMonths.map(({ month, count }) => (
//                       <li key={month}>
//                         <span>{month}</span>
//                         <span className={styles.categoryCount}>{count}</span>
//                       </li>
//                     ))
//                   ) : (
//                     <li>No timestamp data available or valid.</li>
//                   )}
//                 </ul>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }