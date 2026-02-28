import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImageUpload from './ImageUpload';
import api from '../../services/api';

vi.mock('../../services/api');

describe('ImageUpload Component', () => {
  const mockOnUploadSuccess = vi.fn();
  const defaultProps = {
    onUploadSuccess: mockOnUploadSuccess,
    uploadEndpoint: '/api/upload',
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 5 * 1024 * 1024,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload area', () => {
    render(<ImageUpload {...defaultProps} />);
    expect(screen.getByText(/Click to upload/i)).toBeInTheDocument();
  });

  it('validates file type - rejects invalid types', () => {
    render(<ImageUpload {...defaultProps} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('file-input');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
  });

  it('validates file type - accepts valid types', () => {
    render(<ImageUpload {...defaultProps} />);
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('file-input');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    waitFor(() => {
      expect(screen.queryByText(/Invalid file type/i)).not.toBeInTheDocument();
    });
  });

  it('validates file size - rejects oversized files', () => {
    render(<ImageUpload {...defaultProps} />);
    
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('file-input');
    
    fireEvent.change(input, { target: { files: [largeFile] } });
    
    expect(screen.getByText(/File size exceeds/i)).toBeInTheDocument();
  });

  it('validates file size - accepts files within limit', () => {
    render(<ImageUpload {...defaultProps} />);
    
    const validFile = new File(['content'], 'valid.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('file-input');
    
    fireEvent.change(input, { target: { files: [validFile] } });
    
    waitFor(() => {
      expect(screen.queryByText(/File size exceeds/i)).not.toBeInTheDocument();
    });
  });

  it('displays preview after valid file selection', async () => {
    render(<ImageUpload {...defaultProps} />);
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('file-input');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });
  });

  it('uploads file successfully', async () => {
    api.post.mockResolvedValue({
      data: { data: { imageUrl: 'https://example.com/image.jpg' } },
    });

    render(<ImageUpload {...defaultProps} />);
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('file-input');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Upload')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Upload'));
    
    await waitFor(() => {
      expect(mockOnUploadSuccess).toHaveBeenCalledWith('https://example.com/image.jpg');
    });
  });

  it('handles upload error', async () => {
    api.post.mockRejectedValue({
      response: { data: { message: 'Upload failed' } },
    });

    render(<ImageUpload {...defaultProps} />);
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('file-input');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Upload')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Upload'));
    
    await waitFor(() => {
      expect(screen.getByText(/Upload failed/i)).toBeInTheDocument();
    });
  });

  it('cancels file selection', async () => {
    render(<ImageUpload {...defaultProps} />);
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('file-input');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(screen.getByText(/Click to upload/i)).toBeInTheDocument();
  });
});
