// Utility function to upload image file to server
export async function uploadImageFile(file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('http://localhost:3002/api/upload/image', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.imageUrl;
    } else {
      console.error('Failed to upload image:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error uploading image:', error);
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

