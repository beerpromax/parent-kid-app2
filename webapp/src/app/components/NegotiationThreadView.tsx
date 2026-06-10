import React, { useState, useEffect, useRef } from 'react';
import { useProfile } from '../context/ProfileContext';
import { subscribeOffers, counterOffer, acceptCurrentOffer, rejectNegotiation, cancelNegotiation } from '../../lib/repos/negotiations.repo';
import { NegotiationThread, NegotiationOffer, Role } from '../../lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { MessageSquare, ArrowRight, Check, X, ShieldAlert, Ban } from 'lucide-react';
import { toast } from 'sonner';

// --- Offer Bubble component ---
interface OfferBubbleProps {
  offer: NegotiationOffer;
  isSelf: boolean;
  senderName: string;
}

export const OfferBubble: React.FC<OfferBubbleProps> = ({ offer, isSelf, senderName }) => {
  const getKindLabel = () => {
    switch (offer.kind) {
      case 'open':
        return 'Started negotiation';
      case 'counter':
        return 'Suggested counter-offer';
      case 'accept':
        return 'Accepted value';
      case 'reject':
        return 'Rejected';
      case 'cancel':
        return 'Cancelled';
      default:
        return '';
    }
  };

  const getKindBadgeClass = () => {
    switch (offer.kind) {
      case 'open':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-500 border-none';
      case 'counter':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-none';
      case 'accept':
        return 'bg-green-500/10 text-green-600 dark:text-green-500 border-none';
      case 'reject':
      case 'cancel':
        return 'bg-red-500/10 text-red-600 dark:text-red-500 border-none';
      default:
        return '';
    }
  };

  const bubbleColor = isSelf 
    ? 'bg-primary text-primary-foreground ml-auto rounded-br-none' 
    : 'bg-muted text-foreground mr-auto rounded-bl-none';

  return (
    <div className={`flex flex-col max-w-[80%] my-2 space-y-1 ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
      <span className="text-[10px] text-muted-foreground px-1 font-bold">
        {senderName} • {new Date(offer.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
      </span>
      <div className={`p-3 rounded-2xl shadow-sm text-sm ${bubbleColor}`}>
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <Badge className={`text-[9px] font-black uppercase px-1.5 py-0 ${getKindBadgeClass()}`}>
            {getKindLabel()}
          </Badge>
          <span className="font-extrabold text-xs">
            {offer.value} tokens
          </span>
        </div>
        {offer.message && <p className="leading-relaxed whitespace-pre-wrap">{offer.message}</p>}
      </div>
    </div>
  );
};

// --- Main Negotiation Thread View ---
interface NegotiationThreadViewProps {
  thread: NegotiationThread;
}

export const NegotiationThreadView: React.FC<NegotiationThreadViewProps> = ({ thread }) => {
  const { familyId, currentProfile, profiles } = useProfile();
  const [offers, setOffers] = useState<NegotiationOffer[]>([]);
  const [counterValue, setCounterValue] = useState<string>('');
  const [counterMessage, setCounterMessage] = useState('');
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!familyId || !thread.id) return;
    const unsub = subscribeOffers(familyId, thread.id, (loaded) => {
      setOffers(loaded);
    });
    return unsub;
  }, [familyId, thread.id]);

  useEffect(() => {
    // Scroll to bottom on new offers
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [offers]);

  if (!currentProfile) return null;

  const isStandingOfferMine = thread.currentOfferByProfileId === currentProfile.id;
  const isKid = currentProfile.role === 'kid';

  const getProfileName = (id: string) => {
    const prof = profiles.find((p) => p.id === id);
    return prof ? prof.name : 'Unknown';
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await acceptCurrentOffer(familyId, thread.id, currentProfile.id);
      toast.success('Negotiation accepted and resolved!');
      setShowCounterForm(false);
    } catch (err) {
      console.error('Error accepting offer:', err);
      toast.error('Failed to accept offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await rejectNegotiation(familyId, thread.id, currentProfile.id);
      toast.success('Negotiation rejected');
      setShowCounterForm(false);
    } catch (err) {
      console.error('Error rejecting negotiation:', err);
      toast.error('Failed to reject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      await cancelNegotiation(familyId, thread.id, currentProfile.id);
      toast.success('Negotiation cancelled');
    } catch (err) {
      console.error('Error cancelling negotiation:', err);
      toast.error('Failed to cancel');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCounter = async () => {
    const val = parseInt(counterValue, 10);
    if (isNaN(val) || val < 1) {
      toast.error('Please enter a valid positive token count (at least 1)');
      return;
    }
    if (val === thread.currentOfferValue) {
      toast.error('Your counter-offer must offer a different value!');
      return;
    }

    setIsSubmitting(true);
    try {
      await counterOffer(familyId, thread.id, {
        byProfileId: currentProfile.id,
        value: val,
        message: counterMessage,
      });
      toast.success('Counter offer sent!');
      setCounterValue('');
      setCounterMessage('');
      setShowCounterForm(false);
    } catch (err) {
      console.error('Error countering offer:', err);
      toast.error('Failed to send counter-offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    switch (thread.status) {
      case 'open':
        return <Badge className="bg-blue-500 text-white font-extrabold uppercase text-[10px]">Open</Badge>;
      case 'agreed':
        return <Badge className="bg-green-600 text-white font-extrabold uppercase text-[10px]">Agreed: {thread.agreedValue}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-white font-extrabold uppercase text-[10px]">Rejected</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-500 text-white font-extrabold uppercase text-[10px]">Cancelled</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="flex flex-col h-[500px] border border-border bg-card shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="py-4 px-5 border-b border-border/10 flex flex-row items-center justify-between gap-4">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-black text-foreground flex items-center gap-1.5 line-clamp-1">
            <MessageSquare className="w-4 h-4 text-primary shrink-0" />
            <span>{thread.targetTitleSnapshot}</span>
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="font-semibold">{thread.targetType === 'activity' ? 'Activity Value' : 'Reward Cost'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span>Orig: <span className="font-bold text-foreground">{thread.originalValue}</span></span>
            <span>•</span>
            <span>Current Offer: <span className="font-bold text-primary">{thread.currentOfferValue}</span></span>
          </div>
        </div>
        <div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      {/* Chat Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 bg-muted/20">
        <ScrollArea className="h-full pr-2">
          {offers.map((off) => {
            const senderName = getProfileName(off.byProfileId);
            return (
              <OfferBubble
                key={off.id}
                offer={off}
                isSelf={off.byProfileId === currentProfile.id}
                senderName={senderName}
              />
            );
          })}
          <div ref={scrollRef} />
        </ScrollArea>
      </CardContent>

      <Separator className="bg-border/30" />

      {/* Actions Area */}
      <CardFooter className="p-4 bg-card flex flex-col gap-3">
        {thread.status === 'open' ? (
          showCounterForm ? (
            <div className="w-full space-y-3 p-1">
              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="space-y-1">
                  <Label htmlFor="counter-val" className="text-xs font-bold text-foreground">
                    Counter Offer (tokens)
                  </Label>
                  <Input
                    id="counter-val"
                    type="number"
                    min="1"
                    placeholder="e.g. 10"
                    value={counterValue}
                    onChange={(e) => setCounterValue(e.target.value)}
                    className="bg-input-background h-9 text-sm"
                  />
                </div>
                <div className="flex items-end justify-end gap-2 h-full">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCounterForm(false)}
                    disabled={isSubmitting}
                    className="h-9 cursor-pointer"
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCounter}
                    disabled={isSubmitting}
                    className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    Send Counter
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="counter-msg" className="text-xs font-bold text-foreground">
                  Message (optional)
                </Label>
                <Textarea
                  id="counter-msg"
                  placeholder="Explain why you are countering with this value..."
                  value={counterMessage}
                  onChange={(e) => setCounterMessage(e.target.value)}
                  className="bg-input-background min-h-[60px] text-xs py-2"
                />
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-1">
              {isStandingOfferMine ? (
                <>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <ShieldAlert className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Waiting for {getProfileName(thread.currentOfferByProfileId === 'profile_parent' ? thread.initiatedByProfileId : 'profile_parent')}'s reply...</span>
                  </div>
                  {isKid && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                      className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive cursor-pointer font-semibold flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Cancel Negotiation
                    </Button>
                  )}
                </>
              ) : (
                <div className="w-full flex items-center justify-end gap-2.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReject}
                    disabled={isSubmitting}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold flex items-center gap-1 cursor-pointer h-9"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCounterValue('');
                      setCounterMessage('');
                      setShowCounterForm(true);
                    }}
                    disabled={isSubmitting}
                    className="border-primary/20 hover:bg-primary/5 text-primary font-semibold flex items-center gap-1 cursor-pointer h-9"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Counter Offer
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleAccept}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-1 cursor-pointer h-9"
                  >
                    <Check className="w-4 h-4" />
                    Accept Offer
                  </Button>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="py-2 text-center text-xs text-muted-foreground font-medium">
            This negotiation thread is closed.
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
