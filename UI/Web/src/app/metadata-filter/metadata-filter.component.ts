import { Component, ContentChild, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { distinctUntilChanged, forkJoin, map, Observable, of, ReplaySubject, Subject, takeUntil } from 'rxjs';
import { Breakpoint, UtilityService } from '../shared/_services/utility.service';
import { TypeaheadSettings } from '../typeahead/typeahead-settings';
import { CollectionTag } from '../_models/collection-tag';
import { Genre } from '../_models/genre';
import { Library } from '../_models/library';
import { MangaFormat } from '../_models/manga-format';
import { AgeRatingDto } from '../_models/metadata/age-rating-dto';
import { Language } from '../_models/metadata/language';
import { PublicationStatusDto } from '../_models/metadata/publication-status-dto';
import { Person, PersonRole } from '../_models/person';
import { FilterEvent, FilterItem, mangaFormatFilters, SeriesFilter, SortField } from '../_models/series-filter';
import { Tag } from '../_models/tag';
import { CollectionTagService } from '../_services/collection-tag.service';
import { LibraryService } from '../_services/library.service';
import { MetadataService } from '../_services/metadata.service';
import { SeriesService } from '../_services/series.service';
import { FilterSettings } from './filter-settings';

@Component({
  selector: 'app-metadata-filter',
  templateUrl: './metadata-filter.component.html',
  styleUrls: ['./metadata-filter.component.scss']
})
export class MetadataFilterComponent implements OnInit, OnDestroy {

  /**
   * This toggles the opening/collapsing of the metadata filter code
   */
  @Input() filterOpen: EventEmitter<boolean> = new EventEmitter();

  /**
   * Should filtering be shown on the page
   */
  @Input() filteringDisabled: boolean = false;

  @Input() filterSettings!: FilterSettings;

  @Output() applyFilter: EventEmitter<FilterEvent> = new EventEmitter();

  @ContentChild('[ngbCollapse]') collapse!: NgbCollapse;


  formatSettings: TypeaheadSettings<FilterItem<MangaFormat>> = new TypeaheadSettings();
  librarySettings: TypeaheadSettings<Library> = new TypeaheadSettings();
  genreSettings: TypeaheadSettings<Genre> = new TypeaheadSettings();
  collectionSettings: TypeaheadSettings<CollectionTag> = new TypeaheadSettings();
  ageRatingSettings: TypeaheadSettings<AgeRatingDto> = new TypeaheadSettings();
  publicationStatusSettings: TypeaheadSettings<PublicationStatusDto> = new TypeaheadSettings();
  tagsSettings: TypeaheadSettings<Tag> = new TypeaheadSettings();
  languageSettings: TypeaheadSettings<Language> = new TypeaheadSettings();
  peopleSettings: {[PersonRole: string]: TypeaheadSettings<Person>} = {};
  resetTypeaheads: Subject<boolean> = new ReplaySubject(1);

   /**
   * Controls the visiblity of extended controls that sit below the main header.
   */
  filteringCollapsed: boolean = true;

  filter!: SeriesFilter;
  libraries: Array<FilterItem<Library>> = [];


  readProgressGroup!: FormGroup;
  sortGroup!: FormGroup;
  seriesNameGroup!: FormGroup;
  isAscendingSort: boolean = true;

  updateApplied: number = 0;


  private onDestory: Subject<void> = new Subject();

  get PersonRole(): typeof PersonRole {
    return PersonRole;
  }

  get SortField(): typeof SortField {
    return SortField;
  }

  constructor(private libraryService: LibraryService, private metadataService: MetadataService, private seriesService: SeriesService,
    private utilityService: UtilityService, private collectionTagService: CollectionTagService) {
    
    this.filter = this.seriesService.createSeriesFilter();
    this.readProgressGroup = new FormGroup({
      read: new FormControl(this.filter.readStatus.read, []),
      notRead: new FormControl(this.filter.readStatus.notRead, []),
      inProgress: new FormControl(this.filter.readStatus.inProgress, []),
    });

    this.sortGroup = new FormGroup({
      sortField: new FormControl(this.filter.sortOptions?.sortField || SortField.SortName, []),
    });

    this.seriesNameGroup = new FormGroup({
      seriesNameQuery: new FormControl(this.filter.seriesNameQuery || '', [])
    });

    this.readProgressGroup.valueChanges.pipe(takeUntil(this.onDestory)).subscribe(changes => {
      this.filter.readStatus.read = this.readProgressGroup.get('read')?.value;
      this.filter.readStatus.inProgress = this.readProgressGroup.get('inProgress')?.value;
      this.filter.readStatus.notRead = this.readProgressGroup.get('notRead')?.value;

      let sum = 0;
      sum += (this.filter.readStatus.read ? 1 : 0);
      sum += (this.filter.readStatus.inProgress ? 1 : 0);
      sum += (this.filter.readStatus.notRead ? 1 : 0);

      if (sum === 1) {
        if (this.filter.readStatus.read) this.readProgressGroup.get('read')?.disable({ emitEvent: false });
        if (this.filter.readStatus.notRead) this.readProgressGroup.get('notRead')?.disable({ emitEvent: false });
        if (this.filter.readStatus.inProgress) this.readProgressGroup.get('inProgress')?.disable({ emitEvent: false });
      } else {
        this.readProgressGroup.get('read')?.enable({ emitEvent: false });
        this.readProgressGroup.get('notRead')?.enable({ emitEvent: false });
        this.readProgressGroup.get('inProgress')?.enable({ emitEvent: false });
      }
    });

    this.sortGroup.valueChanges.pipe(takeUntil(this.onDestory)).subscribe(changes => {
      if (this.filter.sortOptions == null) {
        this.filter.sortOptions = {
          isAscending: this.isAscendingSort,
          sortField: parseInt(this.sortGroup.get('sortField')?.value, 10)
        };
      }
      this.filter.sortOptions.sortField = parseInt(this.sortGroup.get('sortField')?.value, 10);
    });

    this.seriesNameGroup.get('seriesNameQuery')?.valueChanges.pipe(
      map(val => (val || '').trim()),
      distinctUntilChanged(), 
      takeUntil(this.onDestory)).subscribe(changes => {
      this.filter.seriesNameQuery = changes;
    });
  }

  ngOnInit(): void {
    if (this.filterSettings === undefined) {
      this.filterSettings = new FilterSettings();
    }

    if (this.filterOpen) {
      this.filterOpen.pipe(takeUntil(this.onDestory)).subscribe(openState => {
        this.filteringCollapsed = !openState;
      });
    }

    if (this.filterSettings.presets) {
      this.readProgressGroup.get('read')?.patchValue(this.filterSettings.presets?.readStatus.read);
      this.readProgressGroup.get('notRead')?.patchValue(this.filterSettings.presets?.readStatus.notRead);
      this.readProgressGroup.get('inProgress')?.patchValue(this.filterSettings.presets?.readStatus.inProgress);
    }

    this.setupTypeaheads();
  }

  ngOnDestroy() {
    this.onDestory.next();
    this.onDestory.complete();
  }

  getPersonsSettings(role: PersonRole) {
    return this.peopleSettings[role];
  }

  setupTypeaheads() {

    this.setupFormatTypeahead();

    forkJoin([
      this.setupLibraryTypeahead(),
      this.setupCollectionTagTypeahead(),
      this.setupAgeRatingSettings(),
      this.setupPublicationStatusSettings(),
      this.setupTagSettings(),
      this.setupLanguageSettings(),
      this.setupGenreTypeahead(),
      this.setupPersonTypeahead(),
    ]).subscribe(results => {
      this.resetTypeaheads.next(true);
      if (this.filterSettings.openByDefault) {
        this.filteringCollapsed = false;
      }
      this.apply();
    });
  }

  setupFormatTypeahead() {
    this.formatSettings.minCharacters = 0;
    this.formatSettings.multiple = true;
    this.formatSettings.id = 'format';
    this.formatSettings.unique = true;
    this.formatSettings.addIfNonExisting = false;
    this.formatSettings.fetchFn = (filter: string) => of(mangaFormatFilters).pipe(map(items => this.formatSettings.compareFn(items, filter))); 
    this.formatSettings.compareFn = (options: FilterItem<MangaFormat>[], filter: string) => {
      return options.filter(m => this.utilityService.filter(m.title, filter));
    }

    this.formatSettings.selectionCompareFn = (a: FilterItem<MangaFormat>, b: FilterItem<MangaFormat>) => {
      return a.title == b.title;
    }

    if (this.filterSettings.presets?.formats && this.filterSettings.presets?.formats.length > 0) {
      this.formatSettings.savedData = mangaFormatFilters.filter(item => this.filterSettings.presets?.formats.includes(item.value));
      this.filter.formats = this.formatSettings.savedData.map(item => item.value);
      this.resetTypeaheads.next(true);
    }
  }

  setupLibraryTypeahead() {
    this.librarySettings.minCharacters = 0;
    this.librarySettings.multiple = true;
    this.librarySettings.id = 'libraries';
    this.librarySettings.unique = true;
    this.librarySettings.addIfNonExisting = false;
    this.librarySettings.fetchFn = (filter: string) => {
      return this.libraryService.getLibrariesForMember()
      .pipe(map(items => this.librarySettings.compareFn(items, filter))); 
    };
    this.librarySettings.compareFn = (options: Library[], filter: string) => {
      return options.filter(m => this.utilityService.filter(m.name, filter));
    }
    this.librarySettings.selectionCompareFn = (a: Library, b: Library) => {
      return a.name == b.name;
    }

    if (this.filterSettings.presets?.libraries && this.filterSettings.presets?.libraries.length > 0) {
      return this.librarySettings.fetchFn('').pipe(map(libraries => {
        this.librarySettings.savedData = libraries.filter(item => this.filterSettings.presets?.libraries.includes(item.id));
        this.filter.libraries = this.librarySettings.savedData.map(item => item.id);
        return of(true);
      }));
    }
    return of(true);
  }

  setupGenreTypeahead() {
    this.genreSettings.minCharacters = 0;
    this.genreSettings.multiple = true;
    this.genreSettings.id = 'genres';
    this.genreSettings.unique = true;
    this.genreSettings.addIfNonExisting = false;
    this.genreSettings.fetchFn = (filter: string) => {
      return this.metadataService.getAllGenres(this.filter.libraries)
      .pipe(map(items => this.genreSettings.compareFn(items, filter))); 
    };
    this.genreSettings.compareFn = (options: Genre[], filter: string) => {
      return options.filter(m => this.utilityService.filter(m.title, filter));
    }
    this.genreSettings.selectionCompareFn = (a: Genre, b: Genre) => {
      return a.title == b.title;
    }

    if (this.filterSettings.presets?.genres && this.filterSettings.presets?.genres.length > 0) {
      return this.genreSettings.fetchFn('').pipe(map(genres => {
        this.genreSettings.savedData = genres.filter(item => this.filterSettings.presets?.genres.includes(item.id));
        this.filter.genres = this.genreSettings.savedData.map(item => item.id);
        return of(true);
      }));
    }
    return of(true);
  }

  setupAgeRatingSettings() {
    this.ageRatingSettings.minCharacters = 0;
    this.ageRatingSettings.multiple = true;
    this.ageRatingSettings.id = 'age-rating';
    this.ageRatingSettings.unique = true;
    this.ageRatingSettings.addIfNonExisting = false;
    this.ageRatingSettings.fetchFn = (filter: string) => this.metadataService.getAllAgeRatings(this.filter.libraries)
      .pipe(map(items => this.ageRatingSettings.compareFn(items, filter))); 
    
    this.ageRatingSettings.compareFn = (options: AgeRatingDto[], filter: string) => {
      return options.filter(m => this.utilityService.filter(m.title, filter));
    }

    this.ageRatingSettings.selectionCompareFn = (a: AgeRatingDto, b: AgeRatingDto) => {
      return a.title == b.title;
    }

    if (this.filterSettings.presets?.ageRating && this.filterSettings.presets?.ageRating.length > 0) {
      return this.ageRatingSettings.fetchFn('').pipe(map(rating => {
        this.ageRatingSettings.savedData = rating.filter(item => this.filterSettings.presets?.ageRating.includes(item.value));
        this.filter.ageRating = this.ageRatingSettings.savedData.map(item => item.value);
        return of(true);
      }));
    }
    return of(true);
  }

  setupPublicationStatusSettings() {
    this.publicationStatusSettings.minCharacters = 0;
    this.publicationStatusSettings.multiple = true;
    this.publicationStatusSettings.id = 'publication-status';
    this.publicationStatusSettings.unique = true;
    this.publicationStatusSettings.addIfNonExisting = false;
    this.publicationStatusSettings.fetchFn = (filter: string) => this.metadataService.getAllPublicationStatus(this.filter.libraries)
      .pipe(map(items => this.publicationStatusSettings.compareFn(items, filter))); 
    
    this.publicationStatusSettings.compareFn = (options: PublicationStatusDto[], filter: string) => {
      return options.filter(m => this.utilityService.filter(m.title, filter));
    }

    this.publicationStatusSettings.selectionCompareFn = (a: PublicationStatusDto, b: PublicationStatusDto) => {
      return a.title == b.title;
    }

    if (this.filterSettings.presets?.publicationStatus && this.filterSettings.presets?.publicationStatus.length > 0) {
      return this.publicationStatusSettings.fetchFn('').pipe(map(statuses => {
        this.publicationStatusSettings.savedData = statuses.filter(item => this.filterSettings.presets?.publicationStatus.includes(item.value));
        this.filter.publicationStatus = this.publicationStatusSettings.savedData.map(item => item.value);
        return of(true);
      }));
    }
    return of(true);
  }

  setupTagSettings() {
    this.tagsSettings.minCharacters = 0;
    this.tagsSettings.multiple = true;
    this.tagsSettings.id = 'tags';
    this.tagsSettings.unique = true;
    this.tagsSettings.addIfNonExisting = false;
    this.tagsSettings.compareFn = (options: Tag[], filter: string) => {
      return options.filter(m => this.utilityService.filter(m.title, filter));
    }
    this.tagsSettings.fetchFn = (filter: string) => this.metadataService.getAllTags(this.filter.libraries)
      .pipe(map(items => this.tagsSettings.compareFn(items, filter))); 
    
    this.tagsSettings.selectionCompareFn = (a: Tag, b: Tag) => {
      return a.id == b.id;
    }

    if (this.filterSettings.presets?.tags && this.filterSettings.presets?.tags.length > 0) {
      return this.tagsSettings.fetchFn('').pipe(map(tags => {
        this.tagsSettings.savedData = tags.filter(item => this.filterSettings.presets?.tags.includes(item.id));
        this.filter.tags = this.tagsSettings.savedData.map(item => item.id);
        return of(true);
      }));
    }
    return of(true);
  }

  setupLanguageSettings() {
    this.languageSettings.minCharacters = 0;
    this.languageSettings.multiple = true;
    this.languageSettings.id = 'languages';
    this.languageSettings.unique = true;
    this.languageSettings.addIfNonExisting = false;
    this.languageSettings.compareFn = (options: Language[], filter: string) => {
      return options.filter(m => this.utilityService.filter(m.title, filter));
    }
    this.languageSettings.fetchFn = (filter: string) => this.metadataService.getAllLanguages(this.filter.libraries)
          .pipe(map(items => this.languageSettings.compareFn(items, filter))); 

    this.languageSettings.selectionCompareFn = (a: Language, b: Language) => {
      return a.isoCode == b.isoCode;
    }

    if (this.filterSettings.presets?.languages && this.filterSettings.presets?.languages.length > 0) {
      return this.languageSettings.fetchFn('').pipe(map(languages => {
        this.languageSettings.savedData = languages.filter(item => this.filterSettings.presets?.languages.includes(item.isoCode));
        this.filter.languages = this.languageSettings.savedData.map(item => item.isoCode);
        return of(true);
      }));
    }
    return of(true);
  }

  setupCollectionTagTypeahead() {
    this.collectionSettings.minCharacters = 0;
    this.collectionSettings.multiple = true;
    this.collectionSettings.id = 'collections';
    this.collectionSettings.unique = true;
    this.collectionSettings.addIfNonExisting = false;
    this.collectionSettings.compareFn = (options: CollectionTag[], filter: string) => {
      return options.filter(m => this.utilityService.filter(m.title, filter));
    }
    this.collectionSettings.fetchFn = (filter: string) => this.collectionTagService.allTags()
      .pipe(map(items => this.collectionSettings.compareFn(items, filter)));

    this.collectionSettings.selectionCompareFn = (a: CollectionTag, b: CollectionTag) => {
      return a.id == b.id;
    }

    if (this.filterSettings.presets?.collectionTags && this.filterSettings.presets?.collectionTags.length > 0) {
      return this.collectionSettings.fetchFn('').pipe(map(tags => {
        this.collectionSettings.savedData = tags.filter(item => this.filterSettings.presets?.collectionTags.includes(item.id));
        this.filter.collectionTags = this.collectionSettings.savedData.map(item => item.id);
        return of(true);
      }));
    }
    return of(true);
  }

  updateFromPreset(id: string, peopleFilterField: Array<any>, presetField: Array<any> | undefined, role: PersonRole) {
    const personSettings = this.createBlankPersonSettings(id, role)
    if (presetField && presetField.length > 0) {
      const fetch = personSettings.fetchFn as ((filter: string) => Observable<Person[]>);
      return fetch('').pipe(map(people => {
        personSettings.savedData = people.filter(item => presetField.includes(item.id));
        peopleFilterField = personSettings.savedData.map(item => item.id);
        this.resetTypeaheads.next(true);
        this.peopleSettings[role] = personSettings;
        this.updatePersonFilters(personSettings.savedData as Person[], role);
        return true;
      }));
    } else {
      this.peopleSettings[role] = personSettings;
      return of(true);
    }
  }

  setupPersonTypeahead() {
    this.peopleSettings = {};

    return forkJoin([
      this.updateFromPreset('writers', this.filter.writers, this.filterSettings.presets?.writers, PersonRole.Writer),
      this.updateFromPreset('character', this.filter.character, this.filterSettings.presets?.character, PersonRole.Character),  
      this.updateFromPreset('colorist', this.filter.colorist, this.filterSettings.presets?.colorist, PersonRole.Colorist),
      this.updateFromPreset('cover-artist', this.filter.coverArtist, this.filterSettings.presets?.coverArtist, PersonRole.CoverArtist),
      this.updateFromPreset('editor', this.filter.editor, this.filterSettings.presets?.editor, PersonRole.Editor),
      this.updateFromPreset('inker', this.filter.inker, this.filterSettings.presets?.inker, PersonRole.Inker),
      this.updateFromPreset('letterer', this.filter.letterer, this.filterSettings.presets?.letterer, PersonRole.Letterer),
      this.updateFromPreset('penciller', this.filter.penciller, this.filterSettings.presets?.penciller, PersonRole.Penciller),
      this.updateFromPreset('publisher', this.filter.publisher, this.filterSettings.presets?.publisher, PersonRole.Publisher),
      this.updateFromPreset('translators', this.filter.translators, this.filterSettings.presets?.translators, PersonRole.Translator)
    ]).pipe(map(results => {
      this.resetTypeaheads.next(true);
      return of(true);
    }));
  }

  fetchPeople(role: PersonRole, filter: string) { 
    return this.metadataService.getAllPeople(this.filter.libraries).pipe(map(people => {
      return people.filter(p => p.role == role && this.utilityService.filter(p.name, filter));
    }));
  }

  createBlankPersonSettings(id: string, role: PersonRole) {
    var personSettings = new TypeaheadSettings<Person>();
    personSettings.minCharacters = 0;
    personSettings.multiple = true;
    personSettings.unique = true;
    personSettings.addIfNonExisting = false;
    personSettings.id = id;
    personSettings.compareFn = (options: Person[], filter: string) => {
      return options.filter(m => this.utilityService.filter(m.name, filter));
    }

    personSettings.selectionCompareFn = (a: Person, b: Person) => {
      return a.name == b.name && a.role == b.role;
    }
    personSettings.fetchFn = (filter: string) => {
      return this.fetchPeople(role, filter).pipe(map(items => personSettings.compareFn(items, filter)));
    };
    return personSettings;
  }

  updateFormatFilters(formats: FilterItem<MangaFormat>[]) {
    this.filter.formats = formats.map(item => item.value) || [];
  }

  updateLibraryFilters(libraries: Library[]) {
    this.filter.libraries = libraries.map(item => item.id) || [];
  }

  updateGenreFilters(genres: Genre[]) {
    this.filter.genres = genres.map(item => item.id) || [];
  }

  updateTagFilters(tags: Tag[]) {
    this.filter.tags = tags.map(item => item.id) || [];
  }

  updatePersonFilters(persons: Person[], role: PersonRole) {
    switch (role) {
      case PersonRole.CoverArtist:
        this.filter.coverArtist = persons.map(p => p.id);
        break;
      case PersonRole.Character:
        this.filter.character = persons.map(p => p.id);
        break;
      case PersonRole.Colorist:
        this.filter.colorist = persons.map(p => p.id);
        break;
      case PersonRole.Editor:
        this.filter.editor = persons.map(p => p.id);
        break;
      case PersonRole.Inker:
        this.filter.inker = persons.map(p => p.id);
        break;
      case PersonRole.Letterer:
        this.filter.letterer = persons.map(p => p.id);
        break;
      case PersonRole.Penciller:
        this.filter.penciller = persons.map(p => p.id);
        break;
      case PersonRole.Publisher:
        this.filter.publisher = persons.map(p => p.id);
        break;
      case PersonRole.Writer:
        this.filter.writers = persons.map(p => p.id);
        break;
      case PersonRole.Translator:
        this.filter.translators = persons.map(p => p.id);

    }
  }

  updateCollectionFilters(tags: CollectionTag[]) {
    this.filter.collectionTags = tags.map(item => item.id) || [];
  }

  updateRating(rating: any) {
    this.filter.rating = rating;
  }

  updateAgeRating(ratingDtos: AgeRatingDto[]) {
    this.filter.ageRating = ratingDtos.map(item => item.value) || [];
  }

  updatePublicationStatus(dtos: PublicationStatusDto[]) {
    this.filter.publicationStatus = dtos.map(item => item.value) || [];
  }

  updateLanguageRating(languages: Language[]) {
    this.filter.languages = languages.map(item => item.isoCode) || [];
  }

  updateReadStatus(status: string) {
    if (status === 'read') {
      this.filter.readStatus.read = !this.filter.readStatus.read;
    } else if (status === 'inProgress') {
      this.filter.readStatus.inProgress = !this.filter.readStatus.inProgress;
    } else if (status === 'notRead') {
      this.filter.readStatus.notRead = !this.filter.readStatus.notRead;
    }
  }

  updateSortOrder() {
    this.isAscendingSort = !this.isAscendingSort;
    if (this.filter.sortOptions === null) {
      this.filter.sortOptions = {
        isAscending: this.isAscendingSort,
        sortField: SortField.SortName
      }
    }

    this.filter.sortOptions.isAscending = this.isAscendingSort;
  }

  clear() {
    this.filter = this.seriesService.createSeriesFilter();
    this.readProgressGroup.get('read')?.setValue(true);
    this.readProgressGroup.get('notRead')?.setValue(true);
    this.readProgressGroup.get('inProgress')?.setValue(true);
    this.sortGroup.get('sortField')?.setValue(SortField.SortName);
    this.isAscendingSort = true;
    // Apply any presets which will trigger the apply
    this.setupTypeaheads();
  }

  apply() {
    this.applyFilter.emit({filter: this.filter, isFirst: this.updateApplied === 0});
    this.updateApplied++;
  }

}
