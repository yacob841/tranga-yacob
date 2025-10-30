import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MangaCard from '../src/components/MangaCard';

describe('MangaCard', () => {
  it('renders loading skeleton', () => {
    render(<MangaCard isLoading />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument(); // Assume Skeleton has data-testid
  });

  it('renders manga details', () => {
    const manga = { key: 'test', name: 'Test Manga', description: 'Desc' };
    render(
      <MemoryRouter>
        <MangaCard manga={manga} />
      </MemoryRouter>
    );
    expect(screen.getByText('Test Manga')).toBeInTheDocument();
    expect(screen.getByLabelText(/Manga card for Test Manga/)).toBeInTheDocument();
  });
});