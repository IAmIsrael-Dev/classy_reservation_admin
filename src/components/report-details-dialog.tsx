import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import {
  FileWarning,
  Building2,
  Clock,
  MessageSquare,
  MapPin,
  Star,
  AlertTriangle,
  CheckCircle2,
  Eye,
} from 'lucide-react';

interface Report {
  id: string;
  restaurantId: string;
  restaurantName: string;
  type: 'safety' | 'food' | 'service' | 'other';
  description: string;
  status: 'pending' | 'resolved';
  reportedAt: string;
}

interface Restaurant {
  id: string;
  name: string;
  location: string;
  averageRating: number;
  totalReviews: number;
  recentReports: number;
  status: 'active' | 'inactive';
  totalReservations: number;
}

interface ReportDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
  restaurants: Restaurant[];
  onResolveReport: (reportId: string) => void;
  onViewRestaurant: (restaurant: Restaurant) => void;
}

export function ReportDetailsDialog({
  isOpen,
  onClose,
  report,
  restaurants,
  onResolveReport,
  onViewRestaurant,
}: ReportDetailsDialogProps) {
  if (!report) return null;

  const restaurant = restaurants.find(r => r.id === report.restaurantId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-[90vw] lg:w-full bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Report Details</DialogTitle>
          <DialogDescription>Comprehensive information about the selected report</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Compact Header with Gradient */}
          <div className="relative px-4 sm:px-6 pt-4 sm:pt-6 pb-4 bg-gradient-to-br from-red-600/20 via-orange-600/20 to-yellow-600/20 border-b border-slate-700">
            <div className="flex items-start gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center ring-2 ring-slate-800">
                  <FileWarning className="w-7 h-7 text-white" />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-slate-900 ${
                  report.status === 'pending' ? 'bg-yellow-400' : 'bg-green-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-slate-100 mb-0.5 truncate">Report #{report.id}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2">
                  <span className="truncate max-w-[200px]">{report.restaurantName}</span>
                  <span>•</span>
                  <span>{report.reportedAt}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    className={`text-[10px] px-1.5 py-0.5 ${
                      report.type === 'safety'
                        ? 'bg-red-500 text-white'
                        : report.type === 'food'
                        ? 'bg-orange-500 text-white'
                        : report.type === 'service'
                        ? 'bg-yellow-500 text-black'
                        : 'bg-slate-600 text-white'
                    }`}
                  >
                    {report.type === 'safety' ? '⚠️ Safety' :
                     report.type === 'food' ? '🍽️ Food' :
                     report.type === 'service' ? '👥 Service' :
                     'Other'}
                  </Badge>
                  <Badge
                    className={`text-[10px] px-1.5 py-0.5 ${
                      report.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                        : 'bg-green-500/20 text-green-400 border border-green-500/50'
                    }`}
                  >
                    {report.status === 'pending' ? 'Pending' : 'Resolved'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Report Description */}
          <div className="px-4 sm:px-6">
            <Card className="p-4 bg-slate-800/50 border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <h4 className="text-xs font-medium text-slate-300 uppercase tracking-wide">Description</h4>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed break-words">{report.description}</p>
            </Card>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 sm:px-6">
            {/* Restaurant Info */}
            <Card className="p-4 bg-slate-800/50 border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <h4 className="text-xs font-medium text-slate-300 uppercase tracking-wide">Restaurant</h4>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-slate-700/50 rounded flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-slate-500 mb-0.5">Name</div>
                    <div className="text-xs text-slate-200">{report.restaurantName}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-slate-700/50 rounded flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-slate-500 mb-0.5">Location</div>
                    <div className="text-xs text-slate-200">{restaurant?.location || 'N/A'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-slate-700/50 rounded flex items-center justify-center flex-shrink-0">
                    <Star className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-slate-500 mb-0.5">Rating</div>
                    <div className="text-xs text-slate-200">
                      {restaurant?.averageRating.toFixed(1) || 'N/A'} / 5.0
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-4 bg-slate-800/50 border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <h4 className="text-xs font-medium text-slate-300 uppercase tracking-wide">Timeline</h4>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <div className="w-0.5 h-full bg-slate-700" />
                  </div>
                  <div className="flex-1 pb-3 min-w-0">
                    <div className="text-xs text-slate-200">Report Submitted</div>
                    <div className="text-[10px] text-slate-400">{report.reportedAt}</div>
                  </div>
                </div>
                {report.status === 'resolved' && (
                  <div className="flex gap-2">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-200">Report Resolved</div>
                      <div className="text-[10px] text-slate-400">Recently resolved</div>
                    </div>
                  </div>
                )}
                {report.status === 'pending' && (
                  <div className="flex gap-2">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-200">Under Review</div>
                      <div className="text-[10px] text-slate-400">Awaiting action</div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 px-4 sm:px-6">
            <div className="p-3 bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 rounded-lg">
              <div className="flex flex-col items-center text-center">
                <AlertTriangle className="w-4 h-4 text-red-400 mb-1" />
                <div className="text-lg font-semibold text-slate-100">
                  {restaurant?.recentReports || 0}
                </div>
                <div className="text-[10px] text-slate-400">Reports</div>
              </div>
            </div>

            <div className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg">
              <div className="flex flex-col items-center text-center">
                <MessageSquare className="w-4 h-4 text-blue-400 mb-1" />
                <div className="text-lg font-semibold text-slate-100">
                  {restaurant?.totalReviews || 0}
                </div>
                <div className="text-[10px] text-slate-400">Reviews</div>
              </div>
            </div>

            <div className="p-3 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg">
              <div className="flex flex-col items-center text-center">
                <Star className="w-4 h-4 text-yellow-400 mb-1" />
                <div className="text-lg font-semibold text-slate-100">
                  {restaurant?.averageRating.toFixed(1) || 'N/A'}
                </div>
                <div className="text-[10px] text-slate-400">Rating</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 px-4 sm:px-6 pb-4 border-t border-slate-700 pt-4">
            {report.status === 'pending' && (
              <Button 
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-9"
                onClick={() => {
                  onResolveReport(report.id);
                  onClose();
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Resolve
              </Button>
            )}
            <Button 
              size="sm"
              variant="outline"
              className="flex-1 border-blue-600/50 text-blue-400 hover:bg-blue-600/10 hover:border-blue-600 text-xs h-9"
              onClick={() => {
                if (restaurant) {
                  onClose();
                  onViewRestaurant(restaurant);
                }
              }}
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              View Restaurant
            </Button>
            <Button 
              size="sm"
              variant="outline" 
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 text-xs h-9"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}