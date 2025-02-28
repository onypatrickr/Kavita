import { MangaFormat } from './manga-format';
import { Volume } from './volume';

export interface Series {
    id: number;
    name: string;
    /**
     * This is not shown to user
     */
    originalName: string;
    localizedName: string;
    sortName: string;
    coverImageLocked: boolean;
    sortNameLocked: boolean;
    localizedNameLocked: boolean;
    nameLocked: boolean;
    volumes: Volume[];
    /**
     * Total pages in series
     */
    pages: number;
    /**
     * Total pages the logged in user has read
     */
    pagesRead: number;
    /**
     * User's rating (0-5)
     */
    userRating: number;
    /**
     * The user's review
     */
    userReview: string;
    libraryId: number;
    /**
     * DateTime the entity was created
     */
    created: string;
    /**
     * Format of the Series
     */
    format: MangaFormat;
    /**
     * DateTime that represents last time the logged in user read this series
     */
    latestReadDate: string;
}
