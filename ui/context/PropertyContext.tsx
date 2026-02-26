import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { propertyService } from '@/services/apiClient';
import type { Property } from '@/services/apiTypes';

interface PropertyContextType {
  properties: Property[];
  selectedProperty: Property | null;
  selectedPropertyId: string | null;
  loading: boolean;
  switchProperty: (propertyId: string) => void;
  refreshProperties: () => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId) || null;

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await propertyService.getProperties();
      const propertiesData = response.data || [];
      setProperties(propertiesData);

      if (propertiesData.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(propertiesData[0].id);
      } else if (propertiesData.length === 0) {
        setSelectedPropertyId(null);
      } else if (selectedPropertyId && !propertiesData.find(p => p.id === selectedPropertyId)) {
        setSelectedPropertyId(propertiesData[0].id);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
      setSelectedPropertyId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const switchProperty = (propertyId: string) => {
    if (properties.find(p => p.id === propertyId)) {
      setSelectedPropertyId(propertyId);
    }
  };

  const refreshProperties = async () => {
    await fetchProperties();
  };

  return (
    <PropertyContext.Provider
      value={{
        properties,
        selectedProperty,
        selectedPropertyId,
        loading,
        switchProperty,
        refreshProperties,
      }}>
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
}
