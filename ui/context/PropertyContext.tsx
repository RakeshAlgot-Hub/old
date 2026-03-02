import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { propertyService } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import type { Property } from '@/services/apiTypes';
import { propertyStorage } from '@/services/propertyStorage';
import { clearScreenCache } from '@/services/screenCache';

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
  const { isAuthenticated } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId) || null;

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const response = await propertyService.getProperties();
      const propertiesData = Array.isArray(response?.data) ? response.data : [];
      setProperties(propertiesData);

      if (propertiesData.length === 0) {
        setSelectedPropertyId(null);
        await propertyStorage.clearSelectedPropertyId();
        return;
      }

      const persistedPropertyId = await propertyStorage.getSelectedPropertyId();
      const currentSelectedIsValid = selectedPropertyId
        ? propertiesData.some((p) => p.id === selectedPropertyId)
        : false;
      const persistedIsValid = persistedPropertyId
        ? propertiesData.some((p) => p.id === persistedPropertyId)
        : false;

      const nextSelectedPropertyId = currentSelectedIsValid
        ? selectedPropertyId!
        : persistedIsValid
          ? persistedPropertyId!
          : propertiesData[0].id;

      setSelectedPropertyId(nextSelectedPropertyId);
      await propertyStorage.setSelectedPropertyId(nextSelectedPropertyId);
      // Removed prefetching - screens will lazy-load on focus
    } catch (error) {
      setProperties([]);
      setSelectedPropertyId(null);
      await propertyStorage.clearSelectedPropertyId();
    } finally {
      setLoading(false);
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProperties();
    } else {
      setProperties([]);
      setSelectedPropertyId(null);
      clearScreenCache();
      propertyStorage.clearSelectedPropertyId().catch(() => {
        // ignore storage errors
      });
      setLoading(false);
    }
  }, [isAuthenticated, fetchProperties]);

  const switchProperty = (propertyId: string) => {
    if (properties.find(p => p.id === propertyId)) {
      setSelectedPropertyId(propertyId);
      propertyStorage.setSelectedPropertyId(propertyId).catch(() => {
        // ignore storage errors
      });
      clearScreenCache(); // Clear cache when switching properties
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
