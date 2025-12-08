import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { useToast } from './Toast';
import './ImageCropModal.css';

const ImageCropModal = ({ image, onComplete, onCancel }) => {
    const toast = useToast();
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [quality, setQuality] = useState(0.8);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url) =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.src = url;
        });

    const getCroppedImg = async (imageSrc, pixelCrop, quality) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size to 400x400 (profile photo size)
        const targetSize = 400;
        canvas.width = targetSize;
        canvas.height = targetSize;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            targetSize,
            targetSize
        );

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    resolve(blob);
                },
                'image/jpeg',
                quality
            );
        });
    };

    const handleCrop = async () => {
        try {
            let currentQuality = quality;
            let croppedBlob = await getCroppedImg(image, croppedAreaPixels, currentQuality);

            // Reduce quality until file size is under 50KB
            while (croppedBlob.size > 50000 && currentQuality > 0.1) {
                currentQuality -= 0.1;
                croppedBlob = await getCroppedImg(image, croppedAreaPixels, currentQuality);
            }

            console.log('Final blob size:', croppedBlob.size, 'bytes');
            console.log('Final quality:', currentQuality);

            onComplete(croppedBlob);
        } catch (error) {
            console.error('Error cropping image:', error);
            toast.error('Failed to crop image. Please try again.');
        }
    };

    return (
        <div className="crop-modal-overlay">
            <div className="crop-modal">
                <div className="crop-modal-header">
                    <h2>Crop Profile Photo</h2>
                    <button className="close-btn" onClick={onCancel}>×</button>
                </div>

                <div className="crop-container">
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>

                <div className="crop-controls">
                    <div className="control-group">
                        <label>Zoom</label>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="slider"
                        />
                    </div>

                    <div className="control-group">
                        <label>Quality</label>
                        <input
                            type="range"
                            min={0.1}
                            max={1}
                            step={0.1}
                            value={quality}
                            onChange={(e) => setQuality(parseFloat(e.target.value))}
                            className="slider"
                        />
                        <span className="quality-value">{Math.round(quality * 100)}%</span>
                    </div>
                </div>

                <div className="crop-actions">
                    <button className="btn btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleCrop}>
                        Crop & Upload
                    </button>
                </div>

                <p className="crop-hint">
                    Image will be compressed to under 50KB for optimal upload speed
                </p>
            </div>
        </div>
    );
};

export default ImageCropModal;
