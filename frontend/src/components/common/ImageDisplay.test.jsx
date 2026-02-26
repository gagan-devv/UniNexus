import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageDisplay from './ImageDisplay';

describe('ImageDisplay Component', () => {
  it('renders image with provided URL', () => {
    render(<ImageDisplay imageUrl="https://example.com/image.jpg" altText="Test Image" />);
    const img = screen.getByAltText('Test Image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('displays placeholder when no URL provided', () => {
    render(<ImageDisplay altText="Test Image" />);
    const img = screen.getByAltText('Test Image');
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('data:image/svg+xml');
  });

  it('displays placeholder on image load error', () => {
    render(<ImageDisplay imageUrl="https://example.com/broken.jpg" altText="Test Image" />);
    const img = screen.getByAltText('Test Image');
    
    fireEvent.error(img);
    
    expect(img.src).toContain('data:image/svg+xml');
  });

  it('applies correct size classes', () => {
    const { container } = render(
      <ImageDisplay imageUrl="https://example.com/image.jpg" size="lg" />
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('w-48', 'h-48');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ImageDisplay imageUrl="https://example.com/image.jpg" className="custom-class" />
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('shows loading state initially', () => {
    const { container } = render(<ImageDisplay imageUrl="https://example.com/image.jpg" />);
    const loadingSpinner = container.querySelector('.animate-spin');
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('hides loading state after image loads', () => {
    const { container } = render(<ImageDisplay imageUrl="https://example.com/image.jpg" />);
    const img = screen.getByRole('img');
    
    fireEvent.load(img);
    
    const loadingSpinner = container.querySelector('.animate-spin');
    expect(loadingSpinner).not.toBeInTheDocument();
  });
});
