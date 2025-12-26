// Utility function to upload image file to server
export async function uploadImageFile(file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    // Use BACKEND_URL from environment or fallback to localhost
    const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'http://localhost:3002';
    const uploadUrl = `${BACKEND_URL}/api/upload/image`;
    
    console.log('📤 Uploading image to:', uploadUrl);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Image uploaded successfully:', data.imageUrl);
      
      // Verify the image URL is HTTPS (required for WhatsApp)
      if (data.imageUrl && data.imageUrl.startsWith('https://')) {
        console.log('✅ Image URL is HTTPS - ready for WhatsApp');
      } else if (data.imageUrl && data.imageUrl.startsWith('http://')) {
        console.warn('⚠️ Image URL is HTTP - may not work with WhatsApp Business API');
        console.warn('💡 Consider uploading to a cloud storage service (e.g., Imgur, Google Drive) for HTTPS support');
      }
      
      return data.imageUrl;
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Failed to upload image:', response.status, errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    return null;
  }
}

// Convert local file path to File object (if possible)
export function createFileFromPath(filePath: string): Promise<File | null> {
  return new Promise((resolve) => {
    // This won't work for local file paths - user needs to select file via input
    resolve(null);
  });
}

