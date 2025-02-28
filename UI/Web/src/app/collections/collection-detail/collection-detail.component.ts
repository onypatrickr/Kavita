import { Component, EventEmitter, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, take, takeUntil, takeWhile } from 'rxjs/operators';
import { BulkSelectionService } from 'src/app/cards/bulk-selection.service';
import { EditCollectionTagsComponent } from 'src/app/cards/_modals/edit-collection-tags/edit-collection-tags.component';
import { FilterSettings } from 'src/app/metadata-filter/filter-settings';
import { KEY_CODES, UtilityService } from 'src/app/shared/_services/utility.service';
import { CollectionTag } from 'src/app/_models/collection-tag';
import { SeriesAddedToCollectionEvent } from 'src/app/_models/events/series-added-to-collection-event';
import { Pagination } from 'src/app/_models/pagination';
import { Series } from 'src/app/_models/series';
import { FilterEvent, SeriesFilter } from 'src/app/_models/series-filter';
import { AccountService } from 'src/app/_services/account.service';
import { Action, ActionFactoryService, ActionItem } from 'src/app/_services/action-factory.service';
import { ActionService } from 'src/app/_services/action.service';
import { CollectionTagService } from 'src/app/_services/collection-tag.service';
import { ImageService } from 'src/app/_services/image.service';
import { EVENTS, MessageHubService } from 'src/app/_services/message-hub.service';
import { SeriesService } from 'src/app/_services/series.service';

@Component({
  selector: 'app-collection-detail',
  templateUrl: './collection-detail.component.html',
  styleUrls: ['./collection-detail.component.scss']
})
export class CollectionDetailComponent implements OnInit, OnDestroy {

  collectionTag!: CollectionTag;
  tagImage: string = '';
  isLoading: boolean = true;
  collections: CollectionTag[] = [];
  collectionTagName: string = '';
  series: Array<Series> = [];
  seriesPagination!: Pagination;
  collectionTagActions: ActionItem<CollectionTag>[] = [];
  isAdmin: boolean = false;
  filter: SeriesFilter | undefined = undefined;
  filterSettings: FilterSettings = new FilterSettings();
  summary: string = '';

  actionInProgress: boolean = false;

  filterOpen: EventEmitter<boolean> = new EventEmitter();
  

  private onDestory: Subject<void> = new Subject<void>();

  bulkActionCallback = (action: Action, data: any) => {
    const selectedSeriesIndexies = this.bulkSelectionService.getSelectedCardsForSource('series');
    const selectedSeries = this.series.filter((series, index: number) => selectedSeriesIndexies.includes(index + ''));

    switch (action) {
      case Action.AddToReadingList:
        this.actionService.addMultipleSeriesToReadingList(selectedSeries, () => {
          this.bulkSelectionService.deselectAll();
        });
        break;
      case Action.AddToCollection:
        this.actionService.addMultipleSeriesToCollectionTag(selectedSeries, () => {
          this.bulkSelectionService.deselectAll();
        });
        break;
      case Action.MarkAsRead:
        this.actionService.markMultipleSeriesAsRead(selectedSeries, () => {
          this.loadPage();
          this.bulkSelectionService.deselectAll();
        });
        break;
      case Action.MarkAsUnread:
        this.actionService.markMultipleSeriesAsUnread(selectedSeries, () => {
          this.loadPage();
          this.bulkSelectionService.deselectAll();
        });
        break;
      case Action.Delete:
        this.actionService.deleteMultipleSeries(selectedSeries, () => {
          this.loadPage();
          this.bulkSelectionService.deselectAll();
        });
        break;
    }
  }

  constructor(public imageService: ImageService, private collectionService: CollectionTagService, private router: Router, private route: ActivatedRoute, 
    private seriesService: SeriesService, private toastr: ToastrService, private actionFactoryService: ActionFactoryService, 
    private modalService: NgbModal, private titleService: Title, private accountService: AccountService,
    public bulkSelectionService: BulkSelectionService, private actionService: ActionService, private messageHub: MessageHubService, 
    private utilityService: UtilityService) {
      this.router.routeReuseStrategy.shouldReuseRoute = () => false;

      this.accountService.currentUser$.pipe(take(1)).subscribe(user => {
        if (user) {
          this.isAdmin = this.accountService.hasAdminRole(user);
        }
      });

      const routeId = this.route.snapshot.paramMap.get('id');
      if (routeId === null) {
        this.router.navigate(['collections']);
        return;
      }
      const tagId = parseInt(routeId, 10);
      this.seriesPagination = {currentPage: 0, itemsPerPage: 30, totalItems: 0, totalPages: 1};

      [this.filterSettings.presets, this.filterSettings.openByDefault]  = this.utilityService.filterPresetsFromUrl(this.route.snapshot, this.seriesService.createSeriesFilter());
      this.filterSettings.presets.collectionTags = [tagId];
      
      this.updateTag(tagId);
  }

  ngOnInit(): void {
    this.collectionTagActions = this.actionFactoryService.getCollectionTagActions(this.handleCollectionActionCallback.bind(this));

    this.messageHub.messages$.pipe(takeUntil(this.onDestory), debounceTime(2000)).subscribe(event => {
      if (event.event == EVENTS.SeriesAddedToCollection) {
        const collectionEvent = event.payload as SeriesAddedToCollectionEvent;
        if (collectionEvent.tagId === this.collectionTag.id) {
          this.loadPage();
        }
      } else if (event.event === EVENTS.SeriesRemoved) {
        this.loadPage();
      }
    });
  }

  ngOnDestroy() {
    this.onDestory.next();
    this.onDestory.complete();
  }

  @HostListener('document:keydown.shift', ['$event'])
  handleKeypress(event: KeyboardEvent) {
    if (event.key === KEY_CODES.SHIFT) {
      this.bulkSelectionService.isShiftDown = true;
    }
  }

  @HostListener('document:keyup.shift', ['$event'])
  handleKeyUp(event: KeyboardEvent) {
    if (event.key === KEY_CODES.SHIFT) {
      this.bulkSelectionService.isShiftDown = false;
    }
  }

  updateTag(tagId: number) {
    this.collectionService.allTags().subscribe(tags => {
      this.collections = tags;
      const matchingTags = this.collections.filter(t => t.id === tagId);
      if (matchingTags.length === 0) {
        this.toastr.error('You don\'t have access to any libraries this tag belongs to or this tag is invalid');
        
        return;
      }
      this.collectionTag = matchingTags[0];
      this.summary = (this.collectionTag.summary === null ? '' : this.collectionTag.summary).replace(/\n/g, '<br>');
      this.tagImage = this.imageService.randomize(this.imageService.getCollectionCoverImage(this.collectionTag.id));
      this.titleService.setTitle('Kavita - ' + this.collectionTag.title + ' Collection');
    });
  }

  onPageChange(pagination: Pagination) {
    this.router.navigate(['collections', this.collectionTag.id], {replaceUrl: true, queryParamsHandling: 'merge', queryParams: {page: this.seriesPagination.currentPage} });
    this.loadPage();
  }

  loadPage() {
    const page = this.getPage();
    if (page != null) {
      this.seriesPagination.currentPage = parseInt(page, 10);
    }

    // The filter is out of sync with the presets from typeaheads on first load but syncs afterwards
    if (this.filter == undefined) {
      this.filter = this.seriesService.createSeriesFilter();
      this.filter.collectionTags.push(this.collectionTag.id);
    }

    // TODO: Add ability to filter series for a collection
    // Reload page after a series is updated or first load
    this.seriesService.getSeriesForTag(this.collectionTag.id, this.seriesPagination?.currentPage, this.seriesPagination?.itemsPerPage).subscribe(tags => {
      this.series = tags.result;
      this.seriesPagination = tags.pagination;
      this.isLoading = false;
      window.scrollTo(0, 0);
    });
  }

  updateFilter(event: FilterEvent) {
    this.filter = event.filter;
    const page = this.getPage();
    if (page === undefined || page === null || !event.isFirst) {
      this.seriesPagination.currentPage = 1;
      this.onPageChange(this.seriesPagination);
    } else {
      this.loadPage();
    }
  }

  getPage() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('page');
  }

  handleCollectionActionCallback(action: Action, collectionTag: CollectionTag) {
    switch (action) {
      case(Action.Edit):
        this.openEditCollectionTagModal(this.collectionTag);
        break;
      default:
        break;
    }
  }

  performAction(action: ActionItem<any>) {
    if (typeof action.callback === 'function') {
      action.callback(action.action, this.collectionTag);
    }
  }

  openEditCollectionTagModal(collectionTag: CollectionTag) {
    const modalRef = this.modalService.open(EditCollectionTagsComponent, { size: 'lg', scrollable: true });
    modalRef.componentInstance.tag = this.collectionTag;
    modalRef.closed.subscribe((results: {success: boolean, coverImageUpdated: boolean}) => {
      this.updateTag(this.collectionTag.id);
      this.loadPage();
      if (results.coverImageUpdated) {
        this.tagImage = this.imageService.randomize(this.imageService.getCollectionCoverImage(collectionTag.id));
      }
    });
  }

}
