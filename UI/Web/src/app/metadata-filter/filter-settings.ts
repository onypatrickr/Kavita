import { SeriesFilter } from "../_models/series-filter";

export class FilterSettings {
    libraryDisabled = false;
    formatDisabled = false;
    collectionDisabled = false;
    genresDisabled = false;
    peopleDisabled = false;
    readProgressDisabled = false;
    ratingDisabled = false;
    sortDisabled = false;
    ageRatingDisabled = false;
    tagsDisabled = false;
    languageDisabled = false;
    publicationStatusDisabled = false;
    presets: SeriesFilter | undefined;
    /**
     * Should the filter section be open by default
     */
    openByDefault = false;
  }